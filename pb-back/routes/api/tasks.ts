import type { FastifyPluginAsync } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sql_con } from '../../lib/db.js';

type TaskStatus = 'todo' | 'inProgress' | 'done';
const TASK_STATUSES: ReadonlySet<TaskStatus> = new Set(['todo', 'inProgress', 'done']);

interface TaskRow extends RowDataPacket {
  id: number | string;
  project_id: number | string;
  title: string;
  status: TaskStatus;
  position: number;
}

export interface TaskDTO {
  id: string;
  title: string;
  status: TaskStatus;
  todos: [];
}

function toTaskDTO(row: TaskRow): TaskDTO {
  return {
    id: String(row.id),
    title: row.title,
    status: row.status,
    todos: [],
  };
}

const taskRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/tasks',
    async (request, reply) => {
      const projectId = Number(request.params.projectId);
      if (!Number.isInteger(projectId) || projectId <= 0) {
        return reply.status(400).send({ resultMessage: '잘못된 projectId 입니다.' });
      }

      try {
        const [rows] = await sql_con.promise().query<TaskRow[]>(
          `SELECT id, project_id, title, status, position
             FROM tasks
            WHERE project_id = ?
            ORDER BY status, position, id`,
          [projectId]
        );
        return rows.map(toTaskDTO);
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '작업 목록 조회 실패' });
      }
    }
  );

  fastify.post<{
    Params: { projectId: string };
    Body: { title?: unknown };
  }>('/projects/:projectId/tasks', async (request, reply) => {
    const projectId = Number(request.params.projectId);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 projectId 입니다.' });
    }

    const rawTitle = request.body?.title;
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
    if (!title) {
      return reply.status(400).send({ resultMessage: '작업 제목이 필요합니다.' });
    }
    if (title.length > 255) {
      return reply.status(400).send({ resultMessage: '작업 제목은 255자 이하여야 합니다.' });
    }

    try {
      const [posRows] = await sql_con.promise().query<RowDataPacket[]>(
        `SELECT COALESCE(MAX(position), 0) AS maxPos
           FROM tasks
          WHERE project_id = ? AND status = 'todo'`,
        [projectId]
      );
      const nextPos = Number(posRows[0]?.maxPos ?? 0) + 1000;

      const [result] = await sql_con.promise().query<ResultSetHeader>(
        `INSERT INTO tasks (project_id, title, status, position)
         VALUES (?, ?, 'todo', ?)`,
        [projectId, title, nextPos]
      );

      const dto: TaskDTO = {
        id: String(result.insertId),
        title,
        status: 'todo',
        todos: [],
      };
      return reply.status(201).send(dto);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '작업 생성 실패' });
    }
  });

  fastify.patch<{
    Params: { taskId: string };
    Body: { title?: unknown; status?: unknown; position?: unknown };
  }>('/tasks/:taskId', async (request, reply) => {
    const taskId = Number(request.params.taskId);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 taskId 입니다.' });
    }

    const sets: string[] = [];
    const params: unknown[] = [];

    if (typeof request.body?.title === 'string') {
      const title = request.body.title.trim();
      if (!title) return reply.status(400).send({ resultMessage: '제목은 비울 수 없습니다.' });
      if (title.length > 255) return reply.status(400).send({ resultMessage: '제목은 255자 이하' });
      sets.push('title = ?');
      params.push(title);
    }
    if (typeof request.body?.status === 'string') {
      const s = request.body.status as TaskStatus;
      if (!TASK_STATUSES.has(s)) {
        return reply.status(400).send({ resultMessage: '잘못된 status 값입니다.' });
      }
      sets.push('status = ?');
      params.push(s);
    }
    if (typeof request.body?.position === 'number' && Number.isFinite(request.body.position)) {
      sets.push('position = ?');
      params.push(Math.trunc(request.body.position));
    }

    if (sets.length === 0) {
      return reply.status(400).send({ resultMessage: '변경할 항목이 없습니다.' });
    }

    try {
      params.push(taskId);
      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params);

      if (result.affectedRows === 0) {
        return reply.status(404).send({ resultMessage: '해당 작업을 찾을 수 없습니다.' });
      }

      const [rows] = await sql_con.promise().query<TaskRow[]>(
        `SELECT id, project_id, title, status, position FROM tasks WHERE id = ?`,
        [taskId]
      );
      if (rows.length === 0) {
        return reply.status(404).send({ resultMessage: '해당 작업을 찾을 수 없습니다.' });
      }
      return toTaskDTO(rows[0]);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '작업 수정 실패' });
    }
  });

  fastify.delete<{ Params: { taskId: string } }>('/tasks/:taskId', async (request, reply) => {
    const taskId = Number(request.params.taskId);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 taskId 입니다.' });
    }

    try {
      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>('DELETE FROM tasks WHERE id = ?', [taskId]);
      if (result.affectedRows === 0) {
        return reply.status(404).send({ resultMessage: '해당 작업을 찾을 수 없습니다.' });
      }
      return reply.status(204).send();
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '작업 삭제 실패' });
    }
  });
};

export default taskRoutes;
