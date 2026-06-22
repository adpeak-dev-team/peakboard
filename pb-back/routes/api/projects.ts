import type { FastifyPluginAsync } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sql_con } from '../../lib/db.js';

interface ProjectRow extends RowDataPacket {
  id: number | string;
  board_id: number | string;
  name: string;
  position: number;
}

export interface ProjectDTO {
  id: string;
  boardId: string;
  name: string;
  position: number;
}

function toProjectDTO(row: ProjectRow): ProjectDTO {
  return {
    id: String(row.id),
    boardId: String(row.board_id),
    name: row.name,
    position: row.position,
  };
}

const projectRoutes: FastifyPluginAsync = async (fastify) => {
  // 보드의 프로젝트 목록
  fastify.get<{ Params: { boardId: string } }>(
    '/boards/:boardId/projects',
    async (request, reply) => {
      const boardId = Number(request.params.boardId);
      if (!Number.isInteger(boardId) || boardId <= 0) {
        return reply.status(400).send({ resultMessage: '잘못된 boardId 입니다.' });
      }
      try {
        const [rows] = await sql_con
          .promise()
          .query<ProjectRow[]>(
            'SELECT id, board_id, name, position FROM board_projects WHERE board_id = ? ORDER BY position ASC, id ASC',
            [boardId]
          );
        return rows.map(toProjectDTO);
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '프로젝트 목록 조회 실패' });
      }
    }
  );

  // 프로젝트 생성
  fastify.post<{ Params: { boardId: string }; Body: { name?: unknown } }>(
    '/boards/:boardId/projects',
    async (request, reply) => {
      const boardId = Number(request.params.boardId);
      if (!Number.isInteger(boardId) || boardId <= 0) {
        return reply.status(400).send({ resultMessage: '잘못된 boardId 입니다.' });
      }
      const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
      if (!name) return reply.status(400).send({ resultMessage: '프로젝트 이름이 필요합니다.' });
      if (name.length > 100)
        return reply.status(400).send({ resultMessage: '프로젝트 이름은 100자 이하여야 합니다.' });
      try {
        const [maxRows] = await sql_con
          .promise()
          .query<RowDataPacket[]>(
            'SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM board_projects WHERE board_id = ?',
            [boardId]
          );
        const position = Number(maxRows[0]?.pos ?? 0);
        const [result] = await sql_con
          .promise()
          .query<ResultSetHeader>(
            'INSERT INTO board_projects (board_id, name, position) VALUES (?, ?, ?)',
            [boardId, name, position]
          );
        const dto: ProjectDTO = {
          id: String(result.insertId),
          boardId: String(boardId),
          name,
          position,
        };
        return reply.status(201).send(dto);
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '프로젝트 생성 실패' });
      }
    }
  );

  // 프로젝트 이름 변경
  fastify.patch<{ Params: { id: string }; Body: { name?: unknown } }>(
    '/projects/:id',
    async (request, reply) => {
      const id = Number(request.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({ resultMessage: '잘못된 id 입니다.' });
      }
      const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
      if (!name) return reply.status(400).send({ resultMessage: '프로젝트 이름이 필요합니다.' });
      if (name.length > 100)
        return reply.status(400).send({ resultMessage: '프로젝트 이름은 100자 이하여야 합니다.' });
      try {
        const [result] = await sql_con
          .promise()
          .query<ResultSetHeader>('UPDATE board_projects SET name = ? WHERE id = ?', [name, id]);
        if (result.affectedRows === 0) {
          return reply.status(404).send({ resultMessage: '해당 프로젝트를 찾을 수 없습니다.' });
        }
        return { id: String(id), name };
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '프로젝트 수정 실패' });
      }
    }
  );

  // 프로젝트 삭제 (속한 board_items 도 CASCADE)
  fastify.delete<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 id 입니다.' });
    }
    try {
      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>('DELETE FROM board_projects WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return reply.status(404).send({ resultMessage: '해당 프로젝트를 찾을 수 없습니다.' });
      }
      return reply.status(204).send();
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '프로젝트 삭제 실패' });
    }
  });
};

export default projectRoutes;
