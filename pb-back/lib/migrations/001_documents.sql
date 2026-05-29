-- =============================================================================
-- Migration 001: documents 테이블 추가 (Notion 스타일 문서 협업 Phase 1)
--
-- 적용 방법:
--   mysql -u root -p peakboard < pb-back/lib/migrations/001_documents.sql
-- 또는 MySQL Workbench 등에서 이 파일 내용 실행.
--
-- 기존 데이터는 건드리지 않으며 새 테이블만 추가한다.
-- =============================================================================

USE peakboard;

CREATE TABLE IF NOT EXISTS documents (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id          BIGINT UNSIGNED NOT NULL,
  parent_id           BIGINT UNSIGNED     NULL,
  attached_task_id    BIGINT UNSIGNED     NULL,
  attached_todo_id    BIGINT UNSIGNED     NULL,
  title               VARCHAR(255)    NOT NULL DEFAULT '',
  icon                VARCHAR(16)     NOT NULL DEFAULT '',
  position            INT             NOT NULL DEFAULT 0,
  content_json        LONGTEXT            NULL,
  yjs_state           LONGBLOB            NULL,
  created_by_name     VARCHAR(100)    NOT NULL DEFAULT '',
  updated_by_name     VARCHAR(100)    NOT NULL DEFAULT '',
  created_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                      ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_documents_project_parent_pos (project_id, parent_id, position),
  UNIQUE KEY uk_documents_task (attached_task_id),
  UNIQUE KEY uk_documents_todo (attached_todo_id),
  CONSTRAINT fk_documents_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_documents_parent
    FOREIGN KEY (parent_id) REFERENCES documents(id) ON DELETE CASCADE,
  CONSTRAINT fk_documents_task
    FOREIGN KEY (attached_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_documents_todo
    FOREIGN KEY (attached_todo_id) REFERENCES todos(id) ON DELETE CASCADE,
  CONSTRAINT chk_documents_attach_shape CHECK (
       (attached_task_id IS NULL AND attached_todo_id IS NULL)
    OR (attached_task_id IS NOT NULL AND attached_todo_id IS NULL AND parent_id IS NULL)
    OR (attached_task_id IS NULL AND attached_todo_id IS NOT NULL AND parent_id IS NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
