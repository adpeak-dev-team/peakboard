-- =============================================================================
-- Migration 008: employees.hire_date (입사일)
--
-- 입사일을 기준으로 연차 부여 일수를 자동 계산(프론트)하기 위해 추가.
--
-- 적용 방법:
--   mysql -u root -p peakboard < pb-back/lib/migrations/008_hire_date.sql
-- =============================================================================

USE peakboard;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'hire_date'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE employees ADD COLUMN hire_date DATE NULL AFTER phone',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
