import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import * as Y from 'yjs';
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from 'y-prosemirror';
import { getSchema } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import type { RowDataPacket } from 'mysql2';
import { sql_con } from './db.js';

// 클라이언트(DocumentEditor)의 StarterKit 와 동일한 노드/마크 스키마.
// undoRedo/Placeholder/Collaboration 은 스키마에 영향을 주지 않으므로 StarterKit 만으로 충분.
const schema = getSchema([StarterKit]);

// TipTap Collaboration 기본 XML fragment 이름. 클라이언트와 반드시 일치해야 함.
const FRAGMENT = 'default';

interface DocStateRow extends RowDataPacket {
  yjs_state: Buffer | null;
  content_json: string | null;
}

function parseDocId(documentName: string): number | null {
  const n = Number(documentName);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const database = new Database({
  // 클라이언트 접속 시 1회: 저장된 Yjs 상태를 반환. 없으면 Phase 2 content_json 으로 시드.
  fetch: async ({ documentName }) => {
    const docId = parseDocId(documentName);
    if (!docId) return null;

    const [rows] = await sql_con
      .promise()
      .query<DocStateRow[]>(
        'SELECT yjs_state, content_json FROM documents WHERE id = ?',
        [docId]
      );
    const row = rows[0];
    if (!row) return null;

    if (row.yjs_state && row.yjs_state.length > 0) {
      return new Uint8Array(row.yjs_state);
    }

    // 아직 협업 상태가 없으면 기존 TipTap JSON 으로 Y.Doc 을 시드 (데이터 손실 방지)
    if (row.content_json) {
      try {
        const json = JSON.parse(row.content_json);
        const ydoc = prosemirrorJSONToYDoc(schema, json, FRAGMENT);
        return Y.encodeStateAsUpdate(ydoc);
      } catch {
        return null;
      }
    }
    return null;
  },

  // 변경분을 디바운스(기본 2s)해서 호출됨. Yjs 바이너리 + REST 용 content_json 동시 저장.
  store: async ({ documentName, state, document }) => {
    const docId = parseDocId(documentName);
    if (!docId) return;

    let contentJson: string | null = null;
    try {
      contentJson = JSON.stringify(yDocToProsemirrorJSON(document, FRAGMENT));
    } catch {
      contentJson = null;
    }

    await sql_con
      .promise()
      .query(
        'UPDATE documents SET yjs_state = ?, content_json = COALESCE(?, content_json) WHERE id = ?',
        [state, contentJson, docId]
      );
  },
});

export function startCollabServer(port: number): Promise<unknown> {
  const server = new Server({
    port,
    extensions: [database],
    quiet: true,
  });
  return server.listen();
}
