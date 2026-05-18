import type { FastifyPluginAsync } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sql_con } from '../../lib/db.js';

interface FolderRow extends RowDataPacket {
  id: number | string;
  project_id: number | string;
  name: string;
  position: number;
}

export interface FolderDTO {
  id: string;
  name: string;
  todos: [];
}

function toFolderDTO(row: FolderRow): FolderDTO {
  return {
    id: String(row.id),
    name: row.name,
    todos: [],
  };
}

const folderRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/folders',
    async (request, reply) => {
      const projectId = Number(request.params.projectId);
      if (!Number.isInteger(projectId) || projectId <= 0) {
        return reply.status(400).send({ resultMessage: '잘못된 projectId 입니다.' });
      }

      try {
        const [rows] = await sql_con.promise().query<FolderRow[]>(
          `SELECT id, project_id, name, position
             FROM folders
            WHERE project_id = ? AND owner_user_id IS NULL
            ORDER BY position, id`,
          [projectId]
        );
        return rows.map(toFolderDTO);
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '폴더 목록 조회 실패' });
      }
    }
  );

  fastify.post<{
    Params: { projectId: string };
    Body: { name?: unknown };
  }>('/projects/:projectId/folders', async (request, reply) => {
    const projectId = Number(request.params.projectId);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 projectId 입니다.' });
    }

    const rawName = request.body?.name;
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name) {
      return reply.status(400).send({ resultMessage: '폴더 이름이 필요합니다.' });
    }
    if (name.length > 100) {
      return reply.status(400).send({ resultMessage: '폴더 이름은 100자 이하여야 합니다.' });
    }

    try {
      const [posRows] = await sql_con.promise().query<RowDataPacket[]>(
        `SELECT COALESCE(MAX(position), 0) AS maxPos
           FROM folders
          WHERE project_id = ? AND owner_user_id IS NULL`,
        [projectId]
      );
      const nextPos = Number(posRows[0]?.maxPos ?? 0) + 1000;

      const [result] = await sql_con.promise().query<ResultSetHeader>(
        `INSERT INTO folders (project_id, owner_user_id, name, position)
         VALUES (?, NULL, ?, ?)`,
        [projectId, name, nextPos]
      );

      const dto: FolderDTO = {
        id: String(result.insertId),
        name,
        todos: [],
      };
      return reply.status(201).send(dto);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '폴더 생성 실패' });
    }
  });

  fastify.patch<{ Params: { folderId: string }; Body: { name?: unknown } }>(
    '/folders/:folderId',
    async (request, reply) => {
      const folderId = Number(request.params.folderId);
      if (!Number.isInteger(folderId) || folderId <= 0) {
        return reply.status(400).send({ resultMessage: '잘못된 folderId 입니다.' });
      }
      const rawName = request.body?.name;
      const name = typeof rawName === 'string' ? rawName.trim() : '';
      if (!name) return reply.status(400).send({ resultMessage: '폴더 이름이 필요합니다.' });
      if (name.length > 100) return reply.status(400).send({ resultMessage: '폴더 이름은 100자 이하여야 합니다.' });
      try {
        const [result] = await sql_con
          .promise()
          .query<ResultSetHeader>('UPDATE folders SET name = ? WHERE id = ?', [name, folderId]);
        if (result.affectedRows === 0) {
          return reply.status(404).send({ resultMessage: '해당 폴더를 찾을 수 없습니다.' });
        }
        return { id: String(folderId), name, todos: [] };
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '폴더 수정 실패' });
      }
    }
  );

  fastify.delete<{ Params: { folderId: string } }>('/folders/:folderId', async (request, reply) => {
    const folderId = Number(request.params.folderId);
    if (!Number.isInteger(folderId) || folderId <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 folderId 입니다.' });
    }

    try {
      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>('DELETE FROM folders WHERE id = ?', [folderId]);
      if (result.affectedRows === 0) {
        return reply.status(404).send({ resultMessage: '해당 폴더를 찾을 수 없습니다.' });
      }
      return reply.status(204).send();
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '폴더 삭제 실패' });
    }
  });
};

export default folderRoutes;
