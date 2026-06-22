-- =============================================================================
-- Migration 013: users (로그인/회원가입 — 별도 계정 테이블 + 권한)
--
-- 적용:
--   mysql -u root -p peakboard < pb-back/lib/migrations/013_users.sql
--
-- users         : 로그인 계정. employee_id 로 employees(HR) 와 연결.
-- role          : 'admin'(관리자) | 'member'(일반)
-- password_hash : scrypt 해시 (salt:hash 형식)
-- =============================================================================

USE peakboard;

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255)    NOT NULL,
  name          VARCHAR(100)    NOT NULL,
  password_hash VARCHAR(255)        NULL,
  role          ENUM('admin','member') NOT NULL DEFAULT 'member',
  employee_id   BIGINT UNSIGNED     NULL,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  KEY idx_users_employee (employee_id),
  CONSTRAINT fk_users_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기존(구버전) users 테이블에 employee_id 가 없으면 추가
SET @col := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'employee_id'
);
SET @ddl := IF(@col = 0,
  'ALTER TABLE users
     ADD COLUMN employee_id BIGINT UNSIGNED NULL AFTER role,
     ADD KEY idx_users_employee (employee_id),
     ADD CONSTRAINT fk_users_employee
       FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
