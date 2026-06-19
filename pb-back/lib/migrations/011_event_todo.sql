-- =============================================================================
-- Migration 011: company_events 에 'todo' 카테고리 + done(완료 체크)
--
-- 대시보드에서 추가하는 개인 일정(todo)을 company_events 로 저장하고
-- 체크(완료) 가능하게 한다.
--
-- 적용 방법:
--   mysql -u root -p peakboard < pb-back/lib/migrations/011_event_todo.sql
-- =============================================================================

USE peakboard;

ALTER TABLE company_events
  MODIFY COLUMN category ENUM('leave','company','holiday','todo') NOT NULL DEFAULT 'company';

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'company_events' AND column_name = 'done'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE company_events ADD COLUMN done TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
