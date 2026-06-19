-- =============================================================================
-- Migration 010: board_items.done (완료 체크 — 주로 비개발팀 일정용)
--
-- 대시보드 todo 체크 시: 개발팀은 group_key='완료', 그 외는 done=1.
--
-- 적용 방법:
--   mysql -u root -p peakboard < pb-back/lib/migrations/010_item_done.sql
-- =============================================================================

USE peakboard;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'board_items' AND column_name = 'done'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE board_items ADD COLUMN done TINYINT(1) NOT NULL DEFAULT 0 AFTER notes',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
