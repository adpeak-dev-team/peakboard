-- =============================================================================
-- Migration 007: board_items.project_id FK 교정
--
-- 마이그레이션 003 최초 적용 시(이름 변경 전) board_items.project_id 의 FK 가
-- 레거시 'projects' 테이블을 참조하도록 잘못 생성된 환경이 있다.
-- 이를 'board_projects' 참조로 교정한다. (이미 올바르면 변경 없음)
--
-- 적용 방법:
--   mysql -u root -p peakboard < pb-back/lib/migrations/007_fix_project_fk.sql
-- =============================================================================

USE peakboard;

-- project_id FK 가 board_projects 가 아닌 다른 테이블을 참조하면 DROP
SET @bad_fk := (
  SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'board_items'
    AND COLUMN_NAME = 'project_id' AND REFERENCED_TABLE_NAME IS NOT NULL
    AND REFERENCED_TABLE_NAME <> 'board_projects'
  LIMIT 1
);
SET @ddl := IF(@bad_fk IS NOT NULL,
  CONCAT('ALTER TABLE board_items DROP FOREIGN KEY ', @bad_fk),
  'SELECT 1');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- board_projects 참조 FK 가 없으면 추가
SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'board_items'
    AND COLUMN_NAME = 'project_id' AND REFERENCED_TABLE_NAME = 'board_projects'
);
SET @ddl2 := IF(@has_fk = 0,
  'ALTER TABLE board_items ADD CONSTRAINT fk_board_items_project FOREIGN KEY (project_id) REFERENCES board_projects(id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE s2 FROM @ddl2; EXECUTE s2; DEALLOCATE PREPARE s2;
