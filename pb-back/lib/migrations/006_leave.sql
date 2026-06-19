-- =============================================================================
-- Migration 006: 연차(leave) — employees.leave_total + leave_requests
--
-- 적용 방법:
--   mysql -u root -p peakboard < pb-back/lib/migrations/006_leave.sql
--
-- employees.leave_total : 연 연차 부여 일수(기본 15)
-- leave_requests        : 연차 신청 (status: pending/approved/rejected)
-- =============================================================================

USE peakboard;

-- employees.leave_total 추가 (이미 있으면 무시)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'leave_total'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE employees ADD COLUMN leave_total INT NOT NULL DEFAULT 15 AFTER phone',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS leave_requests (
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
