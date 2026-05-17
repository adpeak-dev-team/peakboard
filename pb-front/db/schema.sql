-- =============================================================================
-- PeakBoard 스키마 (MySQL 8.x / MariaDB 10.5+)
--
-- 설계 원칙
-- 1. user 테이블은 지금 만들지만, FK는 NULL 허용으로 두어 "범용" 모드에서도
--    동작 가능. user 시스템 활성화 시 백필 → NOT NULL 로 ALTER.
-- 2. 폴더는 (project_id, owner_user_id) 조합으로 user별 소유. owner NULL이면
--    "범용 폴더"(현재 모드)로 동작.
-- 3. 프로젝트는 관리자(role='admin')가 생성, project_members 로 멤버 관리.
-- 4. ideas 는 task_id 또는 folder_id 둘 중 하나에만 속함 (CHECK 제약).
-- 5. position 은 INT — 정렬 변경 시 가운데 끼워넣기를 위해 클라이언트에서
--    충분히 띄워서(예: 1000, 2000, 3000) 발급 권장. 빽빽해지면 주기적 재정렬.
-- 6. DATETIME(3) — 밀리초 정밀도. 프런트 Date.now()와 호환.
-- 7. utf8mb4 / utf8mb4_unicode_ci — 한글·이모지 안전.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS ideas;
DROP TABLE IF EXISTS folders;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- users
--   role 'admin' 은 프로젝트 생성 권한 보유.
--   범용 모드에서는 비어있어도 OK (다른 테이블의 user FK는 NULL 허용).
-- =============================================================================
CREATE TABLE users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email           VARCHAR(255)    NOT NULL,
  name            VARCHAR(100)    NOT NULL,
  password_hash   VARCHAR(255)        NULL,  -- OAuth 전용이면 NULL 허용
  role            ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                  ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- projects
--   created_by = 프로젝트 생성한 관리자 user id.
--   user 시스템 활성화 전엔 NULL 허용.
-- =============================================================================
CREATE TABLE projects (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(100)    NOT NULL,
  created_by      BIGINT UNSIGNED     NULL,  -- 추후 NOT NULL 로 ALTER
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                  ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_projects_created_by (created_by),
  CONSTRAINT fk_projects_created_by
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- project_members
--   관리자가 프로젝트에 회원을 초대해서 관리.
--   role 은 "이 프로젝트 안에서의" 역할 — 전역 role 과 별개.
--   PK 는 (project_id, user_id) — 한 사용자는 한 프로젝트에 1번만 속함.
-- =============================================================================
CREATE TABLE project_members (
  project_id      BIGINT UNSIGNED NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  role            ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  invited_by      BIGINT UNSIGNED     NULL,
  joined_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (project_id, user_id),
  KEY idx_pm_user (user_id),
  CONSTRAINT fk_pm_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_invited_by
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- tasks
--   status: todo / inProgress / done (프런트 TaskStatus 와 일치)
--   position: 프로젝트 단위 정렬 (컬럼 필터는 status로). 빈도 낮은 재정렬을 위해
--     클라이언트가 1000, 2000, 3000 형태로 띄워서 발급 권장.
-- =============================================================================
CREATE TABLE tasks (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id      BIGINT UNSIGNED NOT NULL,
  title           VARCHAR(255)    NOT NULL,
  status          ENUM('todo', 'inProgress', 'done') NOT NULL DEFAULT 'todo',
  position        INT             NOT NULL DEFAULT 0,
  created_by      BIGINT UNSIGNED     NULL,
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                  ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_tasks_project_status_pos (project_id, status, position),
  KEY idx_tasks_created_by (created_by),
  CONSTRAINT fk_tasks_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_created_by
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- folders
--   "개인 폴더" — owner_user_id 로 user 별 소유.
--   범용 모드에서는 owner_user_id = NULL (모두 공유).
--   같은 프로젝트 안에서 같은 user 가 같은 이름 폴더를 중복 생성 못 하도록
--   유니크 키 (project_id, owner_user_id, name). owner NULL인 경우는
--   MySQL NULL 다중 허용 정책에 따라 여러 NULL이 충돌하지 않음(원하면 OK).
-- =============================================================================
CREATE TABLE folders (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id      BIGINT UNSIGNED NOT NULL,
  owner_user_id   BIGINT UNSIGNED     NULL,  -- 추후 NOT NULL 로 ALTER
  name            VARCHAR(100)    NOT NULL,
  position        INT             NOT NULL DEFAULT 0,
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                  ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_folders_project_owner_pos (project_id, owner_user_id, position),
  UNIQUE KEY uk_folders_project_owner_name (project_id, owner_user_id, name),
  CONSTRAINT fk_folders_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_folders_owner
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ideas
--   task_id 또는 folder_id 둘 중 정확히 하나만 채워짐.
--   "이동" 은 row 의 task_id ↔ folder_id 를 토글하는 UPDATE 한 번으로 처리.
--   assignee 는 자유 입력 텍스트. user 시스템 도입 시 assignee_user_id 컬럼
--   추가하고 백필 → assignee 컬럼 deprecate 또는 보조 라벨로 유지.
-- =============================================================================
CREATE TABLE ideas (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id         BIGINT UNSIGNED     NULL,
  folder_id       BIGINT UNSIGNED     NULL,
  title           VARCHAR(255)    NOT NULL,
  assignee        VARCHAR(100)    NOT NULL DEFAULT '',  -- 자유 입력 (추후 FK 마이그레이션)
  starred         TINYINT(1)      NOT NULL DEFAULT 0,
  position        INT             NOT NULL DEFAULT 0,
  created_by      BIGINT UNSIGNED     NULL,
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                  ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_ideas_task_pos (task_id, position),
  KEY idx_ideas_folder_pos (folder_id, position),
  KEY idx_ideas_created_by (created_by),
  CONSTRAINT fk_ideas_task
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_ideas_folder
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
  CONSTRAINT fk_ideas_created_by
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  -- 정확히 한 쪽에만 속해야 함
  CONSTRAINT chk_ideas_exactly_one_parent CHECK (
    (task_id IS NOT NULL AND folder_id IS NULL)
    OR (task_id IS NULL AND folder_id IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- 추후 user 시스템 활성화 시 ALTER 예시 (참고용 — 지금 실행 X)
-- =============================================================================
-- 1) 기존 NULL row 들을 admin 계정으로 백필:
--    UPDATE projects SET created_by = <admin_id> WHERE created_by IS NULL;
--    UPDATE folders  SET owner_user_id = <admin_id> WHERE owner_user_id IS NULL;
--
-- 2) NOT NULL 로 잠그기:
--    ALTER TABLE projects MODIFY created_by    BIGINT UNSIGNED NOT NULL;
--    ALTER TABLE folders  MODIFY owner_user_id BIGINT UNSIGNED NOT NULL;
--
-- 3) ideas.assignee 를 user FK 로 전환:
--    ALTER TABLE ideas ADD COLUMN assignee_user_id BIGINT UNSIGNED NULL AFTER assignee,
--      ADD KEY idx_ideas_assignee_user (assignee_user_id),
--      ADD CONSTRAINT fk_ideas_assignee_user
--        FOREIGN KEY (assignee_user_id) REFERENCES users(id) ON DELETE SET NULL;
--    -- 백필: assignee 텍스트 → users 매핑 (이름/이메일 기반 수동 또는 스크립트)
--    -- 검증 후 assignee 컬럼 DROP (또는 라벨용으로 유지)
