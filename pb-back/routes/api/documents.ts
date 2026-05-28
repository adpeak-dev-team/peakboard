import type { FastifyPluginAsync } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sql_con } from '../../lib/db.js';

interface DocumentRow extends RowDataPacket {
  id: number | string;
  project_id: number | string;
  parent_id: number | string | null;
  attached_task_id: number | string | null;
  attached_todo_id: number | string | null;
  title: string;
  icon: string;
  position: number;
  content_json: string | null;
  created_by_name: string;
  updated_by_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentSummaryDTO {
  id: string;
  projectId: string;
  parentId: string | null;
  attachedTaskId: string | null;
  attachedTodoId: string | null;
  title: string;
  icon: string;
  position: number;
  updatedAt: string;
}

export interface DocumentDTO extends DocumentSummaryDTO {
  content: unknown | null;
  createdByName: string;
  updatedByName: string;
  createdAt: string;
}

function toSummaryDTO(row: DocumentRow): DocumentSummaryDTO {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    parentId: row.parent_id == null ? null : String(row.parent_id),
    attachedTaskId: row.attached_task_id == null ? null : String(row.attached_task_id),
    attachedTodoId: row.attached_todo_id == null ? null : String(row.attached_todo_id),
    title: row.title,
    icon: row.icon,
    position: row.position,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function toFullDTO(row: DocumentRow): DocumentDTO {
  let content: unknown | null = null;
  if (row.content_json) {
    try {
      content = JSON.parse(row.content_json);
    } catch {
      content = null;
    }
  }
  return {
    ...toSummaryDTO(row),
    content,
    createdByName: row.created_by_name,
    updatedByName: row.updated_by_name,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function parsePositiveInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const documentRoutes: FastifyPluginAsync = async (fastify) => {
  // 프로젝트 내 "독립 문서 트리" 조회 (첨부 문서는 제외).
  // 본문(content_json)은 제외하고 트리 표시에 필요한 메타만 반환.
  fastify.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/documents',
    async (request, reply) => {
      const projectId = parsePositiveInt(request.params.projectId);
      if (!projectId) {
        return reply.status(400).send({ resultMessage: '잘못된 projectId 입니다.' });
      }
      try {
        const [rows] = await sql_con.promise().query<DocumentRow[]>(
          `SELECT id, project_id, parent_id, attached_task_id, attached_todo_id,
                  title, icon, position, NULL AS content_json,
                  created_by_name, updated_by_name, created_at, updated_at
             FROM documents
            WHERE project_id = ?
              AND attached_task_id IS NULL
              AND attached_todo_id IS NULL
            ORDER BY position, id`,
          [projectId]
        );
        return rows.map(toSummaryDTO);
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '문서 목록 조회 실패' });
      }
    }
  );

  // 새 문서 생성. parent_id 가 주어지면 자식, 아니면 루트.
  fastify.post<{
    Params: { projectId: string };
    Body: { title?: unknown; icon?: unknown; parentId?: unknown; createdByName?: unknown };
  }>('/projects/:projectId/documents', async (request, reply) => {
    const projectId = parsePositiveInt(request.params.projectId);
    if (!projectId) {
      return reply.status(400).send({ resultMessage: '잘못된 projectId 입니다.' });
    }
    const title =
      typeof request.body?.title === 'string' ? request.body.title.trim().slice(0, 255) : '';
    const icon =
      typeof request.body?.icon === 'string' ? request.body.icon.trim().slice(0, 16) : '';
    const createdByName =
      typeof request.body?.createdByName === 'string'
        ? request.body.createdByName.trim().slice(0, 100)
        : '';
    const parentId =
      request.body?.parentId == null ? null : parsePositiveInt(request.body.parentId);
    if (request.body?.parentId != null && parentId == null) {
      return reply.status(400).send({ resultMessage: '잘못된 parentId 입니다.' });
    }

    try {
      // 같은 부모 안에서 마지막 position 다음 자리 계산
      const [posRows] = await sql_con.promise().query<RowDataPacket[]>(
        `SELECT COALESCE(MAX(position), 0) AS maxPos
           FROM documents
          WHERE project_id = ?
            AND attached_task_id IS NULL
            AND attached_todo_id IS NULL
            AND ${parentId == null ? 'parent_id IS NULL' : 'parent_id = ?'}`,
        parentId == null ? [projectId] : [projectId, parentId]
      );
      const nextPos = Number(posRows[0]?.maxPos ?? 0) + 1000;

      const [result] = await sql_con.promise().query<ResultSetHeader>(
        `INSERT INTO documents
           (project_id, parent_id, title, icon, position, content_json,
            created_by_name, updated_by_name)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
        [projectId, parentId, title, icon, nextPos, createdByName, createdByName]
      );

      const [rows] = await sql_con
        .promise()
        .query<DocumentRow[]>(`SELECT * FROM documents WHERE id = ?`, [result.insertId]);
      if (!rows[0]) {
        return reply.status(500).send({ resultMessage: '문서 생성 후 조회 실패' });
      }
      return reply.status(201).send(toFullDTO(rows[0]));
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '문서 생성 실패' });
    }
  });

  // 단건 조회 (본문 포함)
  fastify.get<{ Params: { documentId: string } }>(
    '/documents/:documentId',
    async (request, reply) => {
      const documentId = parsePositiveInt(request.params.documentId);
      if (!documentId) {
        return reply.status(400).send({ resultMessage: '잘못된 documentId 입니다.' });
      }
      try {
        const [rows] = await sql_con
          .promise()
          .query<DocumentRow[]>(`SELECT * FROM documents WHERE id = ?`, [documentId]);
        if (!rows[0]) {
          return reply.status(404).send({ resultMessage: '해당 문서를 찾을 수 없습니다.' });
        }
        return toFullDTO(rows[0]);
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '문서 조회 실패' });
      }
    }
  );

  // 부분 업데이트 — title / icon / content / parent_id / position.
  // content 는 TipTap JSON. updated_by_name 도 함께 받음.
  fastify.patch<{
    Params: { documentId: string };
    Body: {
      title?: unknown;
      icon?: unknown;
      content?: unknown;
      parentId?: unknown;
      position?: unknown;
      updatedByName?: unknown;
    };
  }>('/documents/:documentId', async (request, reply) => {
    const documentId = parsePositiveInt(request.params.documentId);
    if (!documentId) {
      return reply.status(400).send({ resultMessage: '잘못된 documentId 입니다.' });
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (typeof request.body?.title === 'string') {
      fields.push('title = ?');
      values.push(request.body.title.slice(0, 255));
    }
    if (typeof request.body?.icon === 'string') {
      fields.push('icon = ?');
      values.push(request.body.icon.slice(0, 16));
    }
    if ('content' in (request.body ?? {})) {
      fields.push('content_json = ?');
      values.push(
        request.body!.content == null ? null : JSON.stringify(request.body!.content)
      );
    }
    if ('parentId' in (request.body ?? {})) {
      const raw = request.body!.parentId;
      if (raw == null) {
        fields.push('parent_id = NULL');
      } else {
        const pid = parsePositiveInt(raw);
        if (!pid) {
          return reply.status(400).send({ resultMessage: '잘못된 parentId 입니다.' });
        }
        if (pid === documentId) {
          return reply.status(400).send({ resultMessage: '자기 자신을 부모로 지정할 수 없습니다.' });
        }
        fields.push('parent_id = ?');
        values.push(pid);
      }
    }
    if (typeof request.body?.position === 'number' && Number.isInteger(request.body.position)) {
      fields.push('position = ?');
      values.push(request.body.position);
    }
    if (typeof request.body?.updatedByName === 'string') {
      fields.push('updated_by_name = ?');
      values.push(request.body.updatedByName.slice(0, 100));
    }

    if (fields.length === 0) {
      return reply.status(400).send({ resultMessage: '변경할 필드가 없습니다.' });
    }

    try {
      values.push(documentId);
      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>(
          `UPDATE documents SET ${fields.join(', ')} WHERE id = ?`,
          values
        );
      if (result.affectedRows === 0) {
        return reply.status(404).send({ resultMessage: '해당 문서를 찾을 수 없습니다.' });
      }
      const [rows] = await sql_con
        .promise()
        .query<DocumentRow[]>(`SELECT * FROM documents WHERE id = ?`, [documentId]);
      return toFullDTO(rows[0]);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '문서 수정 실패' });
    }
  });

  fastify.delete<{ Params: { documentId: string } }>(
    '/documents/:documentId',
    async (request, reply) => {
      const documentId = parsePositiveInt(request.params.documentId);
      if (!documentId) {
        return reply.status(400).send({ resultMessage: '잘못된 documentId 입니다.' });
      }
      try {
        const [result] = await sql_con
          .promise()
          .query<ResultSetHeader>(`DELETE FROM documents WHERE id = ?`, [documentId]);
        if (result.affectedRows === 0) {
          return reply.status(404).send({ resultMessage: '해당 문서를 찾을 수 없습니다.' });
        }
        return reply.status(204).send();
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '문서 삭제 실패' });
      }
    }
  );

  // task/todo 첨부 문서 — 있으면 가져오고, 없으면 새로 만들어 반환.
  // 클라이언트는 카드 클릭 → 한 번의 호출로 문서를 얻는다.
  const attachHandler =
    (kind: 'task' | 'todo') =>
    async (
      request: import('fastify').FastifyRequest<{
        Params: { id: string };
        Body?: { createdByName?: unknown };
      }>,
      reply: import('fastify').FastifyReply
    ) => {
      const targetId = parsePositiveInt(request.params.id);
      if (!targetId) {
        return reply.status(400).send({ resultMessage: '잘못된 id 입니다.' });
      }
      const col = kind === 'task' ? 'attached_task_id' : 'attached_todo_id';
      const parentTable = kind === 'task' ? 'tasks' : 'todos';

      try {
        const [existing] = await sql_con
          .promise()
          .query<DocumentRow[]>(`SELECT * FROM documents WHERE ${col} = ?`, [targetId]);
        if (existing[0]) {
          return toFullDTO(existing[0]);
        }

        // 첨부 대상이 속한 project_id 를 찾아 함께 저장
        const projectQuery =
          kind === 'task'
            ? `SELECT project_id FROM tasks WHERE id = ?`
            : `SELECT t.project_id
                 FROM todos td
                 LEFT JOIN tasks t   ON t.id = td.task_id
                 LEFT JOIN folders f ON f.id = td.folder_id
                WHERE td.id = ?`;
        const [projRows] = await sql_con
          .promise()
          .query<RowDataPacket[]>(projectQuery, [targetId]);
        const projectId = projRows[0]?.project_id;
        if (projectId == null) {
          // todo 가 folder 에 속한 경우 project_id 가 없을 수 있음 — 첨부 불가 안내
          return reply
            .status(400)
            .send({ resultMessage: `${parentTable} 에서 project_id 를 결정할 수 없습니다.` });
        }
        const createdByName =
          typeof request.body?.createdByName === 'string'
            ? request.body.createdByName.trim().slice(0, 100)
            : '';

        const [result] = await sql_con.promise().query<ResultSetHeader>(
          `INSERT INTO documents
             (project_id, ${col}, title, icon, position, content_json,
              created_by_name, updated_by_name)
           VALUES (?, ?, '', '', 0, NULL, ?, ?)`,
          [projectId, targetId, createdByName, createdByName]
        );
        const [rows] = await sql_con
          .promise()
          .query<DocumentRow[]>(`SELECT * FROM documents WHERE id = ?`, [result.insertId]);
        return reply.status(201).send(toFullDTO(rows[0]));
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '첨부 문서 처리 실패' });
      }
    };

  fastify.post<{ Params: { id: string }; Body?: { createdByName?: unknown } }>(
    '/tasks/:id/document',
    attachHandler('task')
  );
  fastify.post<{ Params: { id: string }; Body?: { createdByName?: unknown } }>(
    '/todos/:id/document',
    attachHandler('todo')
  );
};

export default documentRoutes;
