-- =============================================================================
-- Migration 003: board_projects 테이블 + board_items.project_id (개발팀 프로젝트 관리)
--
-- 적용 방법:
--   mysql -u root -p peakboard < pb-back/lib/migrations/003_projects.sql
--
-- board_projects  : 보드(주로 개발팀) 내 프로젝트. 탭으로 표시.
--   (레거시 'projects' 테이블과 이름 충돌을 피하려 board_projects 로 명명)
-- board_items.project_id : 아이템이 속한 프로젝트(영상팀은 NULL).
-- =============================================================================

USE peakboard;

CREATE TABLE IF NOT EXISTS board_projects (
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

-- board_items.project_id 추가 (이미 있으면 무시)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'board_items' AND column_name = 'project_id'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE board_items
     ADD COLUMN project_id BIGINT UNSIGNED NULL AFTER board_id,
     ADD KEY idx_board_items_project (project_id, group_key, position),
     ADD CONSTRAINT fk_board_items_project
       FOREIGN KEY (project_id) REFERENCES board_projects(id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 개발팀 보드에 기본 프로젝트 시드 (개발팀에 프로젝트가 하나도 없을 때만)
INSERT INTO board_projects (board_id, name, position)
SELECT b.id, '기본 프로젝트', 0
FROM boards b
WHERE b.team_type = 'dev'
  AND NOT EXISTS (SELECT 1 FROM board_projects p WHERE p.board_id = b.id);
