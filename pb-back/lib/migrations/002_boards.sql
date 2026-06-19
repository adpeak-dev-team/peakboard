-- =============================================================================
-- Migration 002: boards / board_items 테이블 (HR 프로젝트관리 리뉴얼)
--
-- 적용 방법:
--   mysql -u root -p peakboard < pb-back/lib/migrations/002_boards.sql
-- 또는 MySQL Workbench 등에서 이 파일 내용 실행.
--
-- boards         : 팀 단위 보드 (영상팀=video, 개발팀=dev)
-- board_items    : 표의 한 행(= 달력의 한 일정). 팀별 추가 컬럼은 fields(JSON) 에 보관.
-- =============================================================================

USE peakboard;

CREATE TABLE IF NOT EXISTS boards (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)    NOT NULL,
  team_type   ENUM('video','dev') NOT NULL,
  position    INT             NOT NULL DEFAULT 0,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS board_items (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  board_id    BIGINT UNSIGNED NOT NULL,
  title       VARCHAR(255)    NOT NULL DEFAULT '',
  group_key   VARCHAR(40)     NOT NULL DEFAULT '',
  event_date  DATE                NULL,
  assignee    VARCHAR(100)    NOT NULL DEFAULT '',
  notes       TEXT                NULL,
  fields      JSON                NULL,
  position    INT             NOT NULL DEFAULT 0,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_board_items_board_group_pos (board_id, group_key, position),
  KEY idx_board_items_board_date (board_id, event_date),
  CONSTRAINT fk_board_items_board
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 시드: 영상팀 / 개발팀 보드 (이미 있으면 추가하지 않음)
INSERT INTO boards (name, team_type, position)
SELECT '영상팀', 'video', 0
WHERE NOT EXISTS (SELECT 1 FROM boards WHERE team_type = 'video');

INSERT INTO boards (name, team_type, position)
SELECT '개발팀', 'dev', 1
WHERE NOT EXISTS (SELECT 1 FROM boards WHERE team_type = 'dev');
