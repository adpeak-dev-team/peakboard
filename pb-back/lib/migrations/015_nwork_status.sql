-- =============================================================================
-- Migration 015: nwork.n_status (계정 상태 태그)
--
-- 적용:
--   mysql -u root -p peakboard < pb-back/lib/migrations/015_nwork_status.sql
--
-- 초기값: n_use = 1 → '사용가능', n_use = 0 → '사용불가'
-- 이후 값 후보: 블로그 / 카페 / 최적화의심 / 최적화 / 직접입력
-- =============================================================================

USE peakboard;

ALTER TABLE nwork
  ADD COLUMN n_status VARCHAR(50) NOT NULL DEFAULT '사용가능' AFTER n_use,
  ADD KEY idx_nwork_status (n_status);

UPDATE nwork SET n_status = IF(n_use = 1, '사용가능', '사용불가');
