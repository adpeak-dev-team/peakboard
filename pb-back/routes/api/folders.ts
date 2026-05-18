import type { FastifyPluginAsync } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sql_con } from '../../lib/db.js';

interface FolderRow extends RowDataPacket {
  id: number | string;
  owner_user_id: number | string | null;
  name: string;
  position: number;
}

export interface FolderDTO {
  id: string;
  name: string;
  todos: [];
}

function toFolderDTO(row: FolderRow): FolderDTO {
  return { id: String(row.id), name: row.name, todos: [] };
}

const folderRoutes: FastifyPluginAsync = async (fastify) => {
  // owner_user_id 기준으로 조회. 현재는 users 미구현이므로 NULL(공유) 폴더 전체 반환.
  fastify.get('/folders', async (request, reply) => {
    try {
      const [rows] = await sql_con.promise().query<FolderRow[]>(
        `SELECT id, owner_user_id, name, position
           FROM folders
          WHERE owner_user_id IS NULL
          ORDER BY position, id`
      );
      return rows.map(toFolderDTO);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '폴더 목록 조회 실패' });
    }
  });

  fastify.post<{ Body: { name?: unknown } }>('/folders', async (request, reply) => {
    const rawName = request.body?.name;
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name) return reply.status(400).send({ resultMessage: '폴더 이름이 필요합니다.' });
    if (name.length > 100) return reply.status(400).send({ resultMessage: '폴더 이름은 100자 이하여야 합니다.' });

    try {
      const [posRows] = await sql_con.promise().query<RowDataPacket[]>(
        `SELECT COALESCE(MAX(position), 0) AS maxPos
           FROM folders
          WHERE owner_user_id IS NULL`
      );
      const nextPos = Number(posRows[0]?.maxPos ?? 0) + 1000;

      const [result] = await sql_con.promise().query<ResultSetHeader>(
        `INSERT INTO folders (owner_user_id, name, position) VALUES (NULL, ?, ?)`,
        [name, nextPos]
      );

      const dto: FolderDTO = { id: String(result.insertId), name, todos: [] };
      return reply.status(201).send(dto);
    } catch (err) {
      console.log('에러남!!');
      console.error(err);
      
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
