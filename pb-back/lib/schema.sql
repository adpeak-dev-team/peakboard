-- =============================================================================
-- PeakBoard 스키마 (HR 프로젝트관리 리뉴얼) — MySQL 8.x
--
-- 이 파일은 docker-compose 의 mysql 초기화 스크립트로 사용된다(빈 볼륨일 때 1회 실행).
-- 기존 DB 에 적용할 때는 pb-back/lib/migrations/002_boards.sql 사용.
--
-- 구조
--   boards       : 팀 단위 보드 (영상팀=video, 개발팀=dev)
--   projects     : 보드(주로 개발팀) 내 프로젝트. 탭으로 표시.
--   board_items  : 표의 한 행(= 달력의 한 일정). 팀별 가변 컬럼은 fields(JSON) 보관.
--
-- 설계 메모
--   - group_key : 영상팀(작업중/자료대기/보류), 개발팀(해야할일/진행중/완료) 분류.
--   - event_date: 달력 뷰 배치 기준. NULL 허용(날짜 미정).
--   - fields    : 팀별 추가 컬럼(구분/브랜드/PM/컨펌상태/자료유형/라이브/산출물 등).
--   - project_id: 개발팀 아이템이 속한 프로젝트(영상팀은 NULL).
--   - 직원/연차/출퇴근(HR) 테이블은 후속 단계에서 추가 예정.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS peakboard DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci;
USE peakboard;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS column_options;
DROP TABLE IF EXISTS board_items;
DROP TABLE IF EXISTS board_projects;
DROP TABLE IF EXISTS boards;
DROP TABLE IF EXISTS company_events;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS employees;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE boards (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)    NOT NULL,
  team_type   ENUM('video','dev') NOT NULL,
  position    INT             NOT NULL DEFAULT 0,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE board_projects (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  board_id    BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(100)    NOT NULL,
  position    INT             NOT NULL DEFAULT 0,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_board_projects_board_pos (board_id, position),
  CONSTRAINT fk_board_projects_board
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE board_items (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  board_id    BIGINT UNSIGNED NOT NULL,
  project_id  BIGINT UNSIGNED     NULL,
  title       VARCHAR(255)    NOT NULL DEFAULT '',
  group_key   VARCHAR(40)     NOT NULL DEFAULT '',
  event_date  DATE                NULL,
  assignee    VARCHAR(100)    NOT NULL DEFAULT '',
  notes       TEXT                NULL,
  done        TINYINT(1)      NOT NULL DEFAULT 0,
  fields      JSON                NULL,
  position    INT             NOT NULL DEFAULT 0,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_board_items_board_group_pos (board_id, group_key, position),
  KEY idx_board_items_board_date (board_id, event_date),
  KEY idx_board_items_project (project_id, group_key, position),
  CONSTRAINT fk_board_items_board
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  CONSTRAINT fk_board_items_project
    FOREIGN KEY (project_id) REFERENCES board_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 표 컬럼 select 값/색상 커스터마이즈
CREATE TABLE column_options (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  board_id    BIGINT UNSIGNED NOT NULL,
  column_key  VARCHAR(40)     NOT NULL,
  value       VARCHAR(100)    NOT NULL,
  color       VARCHAR(80)     NOT NULL DEFAULT '',
  position    INT             NOT NULL DEFAULT 0,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_column_options (board_id, column_key, value),
  CONSTRAINT fk_column_options_board
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 시드: 영상팀 / 개발팀
INSERT INTO boards (name, team_type, position) VALUES
  ('영상팀', 'video', 0),
  ('개발팀', 'dev', 1);

-- 시드: 개발팀 기본 프로젝트
INSERT INTO board_projects (board_id, name, position)
SELECT id, '기본 프로젝트', 0 FROM boards WHERE team_type = 'dev';

-- 직원 (회원관리)
CREATE TABLE employees (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)    NOT NULL DEFAULT '',
  department  VARCHAR(50)     NOT NULL DEFAULT '',
  position    VARCHAR(50)     NOT NULL DEFAULT '',
  email       VARCHAR(255)    NOT NULL DEFAULT '',
  phone       VARCHAR(50)     NOT NULL DEFAULT '',
  hire_date   DATE                NULL,
  leave_total INT             NOT NULL DEFAULT 15,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_employees_dept (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE leave_requests (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id  BIGINT UNSIGNED NOT NULL,
  start_date   DATE            NOT NULL,
  end_date     DATE            NOT NULL,
  days         INT             NOT NULL DEFAULT 1,
  reason       VARCHAR(255)    NOT NULL DEFAULT '',
  status       ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                               ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_leave_employee (employee_id),
  CONSTRAINT fk_leave_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO employees (name, department, position, email, phone) VALUES
  ('김영상', '영상팀', '팀장', 'video.kim@peakboard.io', '010-1000-0001'),
  ('이편집', '영상팀', '대리', 'video.lee@peakboard.io', '010-1000-0002'),
  ('박촬영', '영상팀', '사원', 'video.park@peakboard.io', '010-1000-0003'),
  ('최개발', '개발팀', '팀장', 'dev.choi@peakboard.io', '010-2000-0001'),
  ('정코드', '개발팀', '대리', 'dev.jung@peakboard.io', '010-2000-0002'),
  ('한서버', '개발팀', '사원', 'dev.han@peakboard.io', '010-2000-0003');

-- 연차 / 회사 일정 (일정관리 통합 캘린더)
CREATE TABLE company_events (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_date  DATE            NOT NULL,
  category    ENUM('leave','company','holiday','todo') NOT NULL DEFAULT 'company',
  title       VARCHAR(255)    NOT NULL DEFAULT '',
  done        TINYINT(1)      NOT NULL DEFAULT 0,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_company_events_date (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
