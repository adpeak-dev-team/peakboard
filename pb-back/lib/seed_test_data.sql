-- =============================================================================
-- 테스트용 시드 데이터 (대충 채우기용)
--
-- 적용 (서버에서, repo 디렉터리):
--   docker compose exec -T mysql mysql -uroot -p'rkwkrh13!#' peakboard < pb-back/lib/seed_test_data.sql
--
-- 멱등: 보드/프로젝트/직원은 없을 때만 생성, 보드 아이템은 해당 보드가
--       비어있을 때만 삽입 → 여러 번 실행해도 중복 안 됨.
-- =============================================================================

USE peakboard;

-- ── 보드 (영상팀 / 개발팀) ──────────────────────────────────────────────
INSERT INTO boards (name, team_type, position)
SELECT '영상팀', 'video', 0
WHERE NOT EXISTS (SELECT 1 FROM boards WHERE team_type = 'video');

INSERT INTO boards (name, team_type, position)
SELECT '개발팀', 'dev', 1
WHERE NOT EXISTS (SELECT 1 FROM boards WHERE team_type = 'dev');

-- ── 개발팀 기본 프로젝트 ────────────────────────────────────────────────
INSERT INTO board_projects (board_id, name, position)
SELECT b.id, '기본 프로젝트', 0
FROM boards b
WHERE b.team_type = 'dev'
  AND NOT EXISTS (SELECT 1 FROM board_projects p WHERE p.board_id = b.id);

-- ── 직원 (없을 때만) ────────────────────────────────────────────────────
INSERT INTO employees (name, department, position, email, phone, hire_date)
SELECT * FROM (
  SELECT '김영상' AS name, '영상팀' AS department, '팀장' AS position, 'video.kim@peakboard.io' AS email, '010-1000-0001' AS phone, '2022-03-02' AS hire_date UNION ALL
  SELECT '이편집', '영상팀', '대리', 'video.lee@peakboard.io', '010-1000-0002', '2023-06-01' UNION ALL
  SELECT '박촬영', '영상팀', '사원', 'video.park@peakboard.io', '010-1000-0003', '2024-01-15' UNION ALL
  SELECT '최개발', '개발팀', '팀장', 'dev.choi@peakboard.io', '010-2000-0001', '2021-09-01' UNION ALL
  SELECT '정코드', '개발팀', '대리', 'dev.jung@peakboard.io', '010-2000-0002', '2023-03-02' UNION ALL
  SELECT '한서버', '개발팀', '사원', 'dev.han@peakboard.io', '010-2000-0003', '2024-07-01'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM employees);

-- ── 영상팀 보드 아이템 (보드가 비어있을 때만) ──────────────────────────
INSERT INTO board_items (board_id, group_key, title, assignee, event_date, fields, position)
SELECT b.id, '작업중', '신제품 런칭 영상', '이편집', CURDATE() + INTERVAL 2 DAY,
  JSON_OBJECT('type','신규','brand','탑','company','A스튜디오','customer','홍길동',
              'pm','김PM','confirm1','작업중','material','자료+영상','work1','작업중',
              'live','라이브요청','output','영상'), 0
FROM boards b
WHERE b.team_type = 'video'
  AND NOT EXISTS (SELECT 1 FROM board_items x WHERE x.board_id = b.id);

INSERT INTO board_items (board_id, group_key, title, assignee, event_date, fields, position)
SELECT b.id, '자료대기', '교육 LMS 콘텐츠', '박촬영', CURDATE() + INTERVAL 5 DAY,
  JSON_OBJECT('type','LMS','brand','위드','confirm1','컨펌대기','material','자료만'), 1
FROM boards b
WHERE b.team_type = 'video'
  AND NOT EXISTS (SELECT 1 FROM board_items x WHERE x.board_id = b.id AND x.position > 0);

INSERT INTO board_items (board_id, group_key, title, assignee, event_date, fields, position)
SELECT b.id, '보류', '리뉴얼 홍보영상', '김영상', NULL,
  JSON_OBJECT('type','시안변경','brand','리치','confirm1','미정'), 2
FROM boards b
WHERE b.team_type = 'video'
  AND NOT EXISTS (SELECT 1 FROM board_items x WHERE x.board_id = b.id AND x.position > 1);

-- ── 개발팀 보드 아이템 (보드가 비어있을 때만) ──────────────────────────
INSERT INTO board_items (board_id, project_id, group_key, title, assignee, event_date, position)
SELECT b.id, (SELECT p.id FROM board_projects p WHERE p.board_id = b.id ORDER BY p.position, p.id LIMIT 1),
  '해야할일', 'API 설계', '한서버', CURDATE() + INTERVAL 1 DAY, 0
FROM boards b
WHERE b.team_type = 'dev'
  AND NOT EXISTS (SELECT 1 FROM board_items x WHERE x.board_id = b.id);

INSERT INTO board_items (board_id, project_id, group_key, title, assignee, event_date, position)
SELECT b.id, (SELECT p.id FROM board_projects p WHERE p.board_id = b.id ORDER BY p.position, p.id LIMIT 1),
  '진행중', '보드 아이템 CRUD', '정코드', CURDATE(), 1
FROM boards b
WHERE b.team_type = 'dev'
  AND NOT EXISTS (SELECT 1 FROM board_items x WHERE x.board_id = b.id AND x.position > 0);

INSERT INTO board_items (board_id, project_id, group_key, title, assignee, event_date, position)
SELECT b.id, (SELECT p.id FROM board_projects p WHERE p.board_id = b.id ORDER BY p.position, p.id LIMIT 1),
  '완료', 'DB 스키마 확정', '최개발', CURDATE() - INTERVAL 3 DAY, 2
FROM boards b
WHERE b.team_type = 'dev'
  AND NOT EXISTS (SELECT 1 FROM board_items x WHERE x.board_id = b.id AND x.position > 1);

-- ── 회사 일정 / 공휴일 (없을 때만) ──────────────────────────────────────
INSERT INTO company_events (event_date, category, title)
SELECT CURDATE() + INTERVAL 7 DAY, 'company', '전사 워크숍'
WHERE NOT EXISTS (SELECT 1 FROM company_events WHERE title = '전사 워크숍');

INSERT INTO company_events (event_date, category, title)
SELECT CURDATE() + INTERVAL 10 DAY, 'holiday', '임시공휴일'
WHERE NOT EXISTS (SELECT 1 FROM company_events WHERE title = '임시공휴일');

-- ── 연차 신청 샘플 (없을 때만) ─────────────────────────────────────────
INSERT INTO leave_requests (employee_id, start_date, end_date, days, reason, status)
SELECT e.id, CURDATE() + INTERVAL 3 DAY, CURDATE() + INTERVAL 4 DAY, 2, '개인 사유', 'pending'
FROM employees e
WHERE e.name = '이편집'
  AND NOT EXISTS (SELECT 1 FROM leave_requests);
