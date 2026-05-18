import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sql_con } from '../../lib/db.js';

interface TodoRow extends RowDataPacket {
  id: number | string;
  task_id: number | string | null;
  folder_id: number | string | null;
  title: string;
  description: string | null;
  assignee: string;
  starred: number;
  position: number;
  created_at: Date;
}

export interface TodoDTO {
  id: string;
  taskId: string | null;
  folderId: string | null;
  title: string;
  description: string;
  assignee: string;
  starred: boolean;
  position: number;
  createdAt: number;
}

function toTodoDTO(row: TodoRow): TodoDTO {
  return {
    id: String(row.id),
    taskId: row.task_id == null ? null : String(row.task_id),
    folderId: row.folder_id == null ? null : String(row.folder_id),
    title: row.title,
    description: row.description ?? '',
    assignee: row.assignee ?? '',
    starred: row.starred === 1,
    position: row.position,
    createdAt: row.created_at instanceof Date ? row.created_at.getTime() : Date.now(),
  };
}

const todoRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/todos',
    async (request, reply) => {
      const projectId = Number(request.params.projectId);
      if (!Number.isInteger(projectId) || projectId <= 0) {
        return reply.status(400).send({ resultMessage: '잘못된 projectId 입니다.' });
      }

      try {
        const [rows] = await sql_con.promise().query<TodoRow[]>(
          `SELECT td.id, td.task_id, td.folder_id, td.title, td.description, td.assignee,
                  td.starred, td.position, td.created_at
             FROM todos td
             INNER JOIN tasks t ON t.id = td.task_id
            WHERE t.project_id = ?
            ORDER BY td.task_id, td.position, td.id`,
          [projectId]
        );
        return rows.map(toTodoDTO);
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: 'todos 조회 실패' });
      }
    }
  );

  // 폴더 소속 todos 전체 조회 (폴더는 프로젝트와 독립)
  fastify.get('/todos/folders', async (request, reply) => {
    try {
      const [rows] = await sql_con.promise().query<TodoRow[]>(
        `SELECT id, task_id, folder_id, title, description, assignee,
                starred, position, created_at
           FROM todos
          WHERE folder_id IS NOT NULL
          ORDER BY folder_id, position, id`
      );
      return rows.map(toTodoDTO);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '폴더 todos 조회 실패' });
    }
  });

  fastify.post<{
    Params: { taskId: string };
    Body: { title?: unknown; description?: unknown; assignee?: unknown };
  }>('/tasks/:taskId/todos', async (request, reply) => {
    const taskId = Number(request.params.taskId);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 taskId 입니다.' });
    }
    return createTodo(request, reply, { taskId, folderId: null });
  });

  fastify.post<{
    Params: { folderId: string };
    Body: { title?: unknown; description?: unknown; assignee?: unknown };
  }>('/folders/:folderId/todos', async (request, reply) => {
    const folderId = Number(request.params.folderId);
    if (!Number.isInteger(folderId) || folderId <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 folderId 입니다.' });
    }
    return createTodo(request, reply, { taskId: null, folderId });
  });

  fastify.patch<{
    Params: { todoId: string };
    Body: {
      title?: unknown;
      description?: unknown;
      assignee?: unknown;
      starred?: unknown;
      position?: unknown;
      taskId?: unknown;
      folderId?: unknown;
    };
  }>('/todos/:todoId', async (request, reply) => {
    const todoId = Number(request.params.todoId);
    if (!Number.isInteger(todoId) || todoId <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 todoId 입니다.' });
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    const body = request.body ?? {};

    if (typeof body.title === 'string') {
      const title = body.title.trim();
      if (!title) return reply.status(400).send({ resultMessage: '제목은 비울 수 없습니다.' });
      if (title.length > 255) return reply.status(400).send({ resultMessage: '제목은 255자 이하' });
      sets.push('title = ?');
      params.push(title);
    }
    if (typeof body.description === 'string') {
      sets.push('description = ?');
      params.push(body.description.trim() || null);
    }
    if (typeof body.assignee === 'string') {
      const assignee = body.assignee.trim();
      if (assignee.length > 100) return reply.status(400).send({ resultMessage: '담당자는 100자 이하' });
      sets.push('assignee = ?');
      params.push(assignee);
    }
    if (typeof body.starred === 'boolean') {
      sets.push('starred = ?');
      params.push(body.starred ? 1 : 0);
    }
    if (typeof body.position === 'number' && Number.isFinite(body.position)) {
      sets.push('position = ?');
      params.push(Math.trunc(body.position));
    }

    const hasTaskId = 'taskId' in body;
    const hasFolderId = 'folderId' in body;
    if (hasTaskId || hasFolderId) {
      const nextTaskId = body.taskId == null ? null : Number(body.taskId);
      const nextFolderId = body.folderId == null ? null : Number(body.folderId);

      if (nextTaskId != null && nextFolderId != null) {
        return reply.status(400).send({ resultMessage: 'taskId / folderId 중 하나만 설정해야 합니다.' });
      }
      if (nextTaskId == null && nextFolderId == null) {
        return reply.status(400).send({ resultMessage: 'taskId 또는 folderId 가 필요합니다.' });
      }
      if (nextTaskId != null && (!Number.isInteger(nextTaskId) || nextTaskId <= 0)) {
        return reply.status(400).send({ resultMessage: '잘못된 taskId 입니다.' });
      }
      if (nextFolderId != null && (!Number.isInteger(nextFolderId) || nextFolderId <= 0)) {
        return reply.status(400).send({ resultMessage: '잘못된 folderId 입니다.' });
      }
      sets.push('task_id = ?', 'folder_id = ?');
      params.push(nextTaskId, nextFolderId);
    }

    if (sets.length === 0) {
      return reply.status(400).send({ resultMessage: '변경할 항목이 없습니다.' });
    }

    try {
      params.push(todoId);
      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>(`UPDATE todos SET ${sets.join(', ')} WHERE id = ?`, params);

      if (result.affectedRows === 0) {
        return reply.status(404).send({ resultMessage: '해당 todo 를 찾을 수 없습니다.' });
      }

      const [rows] = await sql_con.promise().query<TodoRow[]>(
        `SELECT id, task_id, folder_id, title, description, assignee, starred, position, created_at
           FROM todos WHERE id = ?`,
        [todoId]
      );
      if (rows.length === 0) {
        return reply.status(404).send({ resultMessage: '해당 todo 를 찾을 수 없습니다.' });
      }
      return toTodoDTO(rows[0]);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: 'todo 수정 실패' });
    }
  });

  fastify.delete<{ Params: { todoId: string } }>('/todos/:todoId', async (request, reply) => {
    const todoId = Number(request.params.todoId);
    if (!Number.isInteger(todoId) || todoId <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 todoId 입니다.' });
    }

    try {
      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>('DELETE FROM todos WHERE id = ?', [todoId]);
      if (result.affectedRows === 0) {
        return reply.status(404).send({ resultMessage: '해당 todo 를 찾을 수 없습니다.' });
      }
      return reply.status(204).send();
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: 'todo 삭제 실패' });
    }
  });
};

async function createTodo(
  request: FastifyRequest,
  reply: FastifyReply,
  parent: { taskId: number | null; folderId: number | null }
) {
  const body = (request.body ?? {}) as { title?: unknown; description?: unknown; assignee?: unknown };

  const rawTitle = body.title;
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
  if (!title) return reply.status(400).send({ resultMessage: 'todo 제목이 필요합니다.' });
  if (title.length > 255) return reply.status(400).send({ resultMessage: '제목은 255자 이하여야 합니다.' });

  const description = typeof body.description === 'string' ? body.description.trim() || null : null;

  const rawAssignee = body.assignee;
  const assignee = typeof rawAssignee === 'string' ? rawAssignee.trim() : '';
  if (assignee.length > 100) return reply.status(400).send({ resultMessage: '담당자는 100자 이하여야 합니다.' });

  try {
    const posQuery =
      parent.taskId != null
        ? 'SELECT COALESCE(MAX(position), 0) AS maxPos FROM todos WHERE task_id = ?'
        : 'SELECT COALESCE(MAX(position), 0) AS maxPos FROM todos WHERE folder_id = ?';
    const posParam = parent.taskId != null ? parent.taskId : parent.folderId;
    const [posRows] = await sql_con.promise().query<RowDataPacket[]>(posQuery, [posParam]);
    const nextPos = Number(posRows[0]?.maxPos ?? 0) + 1000;

    const [result] = await sql_con.promise().query<ResultSetHeader>(
      `INSERT INTO todos (task_id, folder_id, title, description, assignee, starred, position)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [parent.taskId, parent.folderId, title, description, assignee, nextPos]
    );

    const [rows] = await sql_con.promise().query<TodoRow[]>(
      `SELECT id, task_id, folder_id, title, description, assignee, starred, position, created_at
         FROM todos WHERE id = ?`,
      [result.insertId]
    );
    return reply.status(201).send(toTodoDTO(rows[0]));
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ resultMessage: 'todo 생성 실패' });
  }
}

export default todoRoutes;
