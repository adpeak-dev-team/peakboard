-- =============================================================================
-- Migration 014: employees.avatar (프로필 이미지 — base64 data URL 저장)
--
-- 적용:
--   mysql -u root -p peakboard < pb-back/lib/migrations/014_avatar.sql
-- =============================================================================

USE peakboard;

SET @col := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'avatar'
);
SET @ddl := IF(@col = 0,
  'ALTER TABLE employees ADD COLUMN avatar LONGTEXT NULL AFTER phone',
  'SELECT 1');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
