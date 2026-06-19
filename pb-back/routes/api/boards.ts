import type { FastifyPluginAsync } from 'fastify';
import type { RowDataPacket } from 'mysql2';
import { sql_con } from '../../lib/db.js';

interface BoardRow extends RowDataPacket {
  id: number | string;
  name: string;
  team_type: 'video' | 'dev';
  position: number;
}

export interface BoardDTO {
  id: string;
  name: string;
  teamType: 'video' | 'dev';
  position: number;
}

function toBoardDTO(row: BoardRow): BoardDTO {
  return {
    id: String(row.id),
    name: row.name,
    teamType: row.team_type,
    position: row.position,
  };
}

const boardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/boards', async (request, reply) => {
    try {
      const [rows] = await sql_con
        .promise()
        .query<BoardRow[]>(
          'SELECT id, name, team_type, position FROM boards ORDER BY position ASC, id ASC'
        );
      return rows.map(toBoardDTO);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '보드 목록 조회 실패' });
    }
  });
};

export default boardRoutes;
