-- =============================================================================
-- Migration 012: column_options (표 컬럼 select 값/색상 커스터마이즈)
--
-- 영상팀 등 표의 select 컬럼에 사용자가 값을 추가하거나 색상을 지정.
-- 정적 기본 옵션(boardConfig)에 더해 board 별로 덮어쓰기/추가.
--
-- 적용 방법:
--   mysql -u root -p peakboard < pb-back/lib/migrations/012_column_options.sql
-- =============================================================================

USE peakboard;

CREATE TABLE IF NOT EXISTS column_options (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  board_id    BIGINT UNSIGNED NOT NULL,
  column_key  VARCHAR(40)     NOT NULL,
  value       VARCHAR(100)    NOT NULL,
  color       VARCHAR(80)     NOT NULL DEFAULT '',
  position    INT             NOT NULL DEFAULT 0,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_column_options (board_id, column_key, value),
  CONSTRAINT fk_column_options_board
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
