-- =============================================================================
-- Migration 005: employees 테이블 (회원/직원 관리)
--
-- 적용 방법:
--   mysql -u root -p peakboard < pb-back/lib/migrations/005_employees.sql
--
-- 관리자 > 회원관리에서 회사 직원 목록을 관리한다.
-- =============================================================================

USE peakboard;

CREATE TABLE IF NOT EXISTS employees (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)    NOT NULL DEFAULT '',
  department  VARCHAR(50)     NOT NULL DEFAULT '',
  position    VARCHAR(50)     NOT NULL DEFAULT '',
  email       VARCHAR(255)    NOT NULL DEFAULT '',
  phone       VARCHAR(50)     NOT NULL DEFAULT '',
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_employees_dept (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 임시 직원 시드 (직원이 한 명도 없을 때만)
INSERT INTO employees (name, department, position, email, phone)
SELECT * FROM (
  SELECT '김영상' AS name, '영상팀' AS department, '팀장' AS position, 'video.kim@peakboard.io' AS email, '010-1000-0001' AS phone UNION ALL
  SELECT '이편집', '영상팀', '대리', 'video.lee@peakboard.io', '010-1000-0002' UNION ALL
  SELECT '박촬영', '영상팀', '사원', 'video.park@peakboard.io', '010-1000-0003' UNION ALL
  SELECT '최개발', '개발팀', '팀장', 'dev.choi@peakboard.io', '010-2000-0001' UNION ALL
  SELECT '정코드', '개발팀', '대리', 'dev.jung@peakboard.io', '010-2000-0002' UNION ALL
  SELECT '한서버', '개발팀', '사원', 'dev.han@peakboard.io', '010-2000-0003'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM employees);
