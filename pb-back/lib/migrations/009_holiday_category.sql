-- =============================================================================
-- Migration 009: company_events category 에 'holiday'(공휴일) 추가
--
-- 일정관리에서 공휴일을 직접 추가할 수 있도록 category ENUM 확장.
--
-- 적용 방법:
--   mysql -u root -p peakboard < pb-back/lib/migrations/009_holiday_category.sql
-- =============================================================================

USE peakboard;

ALTER TABLE company_events
  MODIFY COLUMN category ENUM('leave','company','holiday') NOT NULL DEFAULT 'company';
