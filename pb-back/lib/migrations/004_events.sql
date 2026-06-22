-- =============================================================================
-- Migration 004: company_events 테이블 (연차 / 회사 일정 관리)
--
-- 적용 방법:
--   mysql -u root -p peakboard < pb-back/lib/migrations/004_events.sql
--
-- category: 'leave'(연차) | 'company'(회사 일정)
-- 일정관리 화면의 통합 캘린더에 보드 작업과 함께 표시된다.
-- =============================================================================

USE peakboard;

CREATE TABLE IF NOT EXISTS company_events (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_date  DATE            NOT NULL,
  category    ENUM('leave','company') NOT NULL DEFAULT 'company',
  title       VARCHAR(255)    NOT NULL DEFAULT '',
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_company_events_date (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
