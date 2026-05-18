import type { FastifyPluginAsync } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sql_con } from '../../lib/db.js';

interface ProjectRow extends RowDataPacket {
  id: number | string;
  name: string;
}

export interface ProjectDTO {
  id: string;
  name: string;
}

function toProjectDTO(row: ProjectRow): ProjectDTO {
  return {
    id: String(row.id),
    name: row.name,
  };
}

const projectRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/projects', async (request, reply) => {
    try {
      const [rows] = await sql_con
        .promise()
        .query<ProjectRow[]>('SELECT id, name FROM projects ORDER BY id ASC');
      return rows.map(toProjectDTO);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '프로젝트 목록 조회 실패' });
    }
  });

  fastify.post<{ Body: { name?: unknown } }>('/projects', async (request, reply) => {
    const rawName = request.body?.name;
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name) {
      return reply.status(400).send({ resultMessage: '프로젝트 이름이 필요합니다.' });
    }
    if (name.length > 100) {
      return reply.status(400).send({ resultMessage: '프로젝트 이름은 100자 이하여야 합니다.' });
    }

    try {
      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>('INSERT INTO projects (name) VALUES (?)', [name]);

      const dto: ProjectDTO = {
        id: String(result.insertId),
        name,
      };
      return reply.status(201).send(dto);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '프로젝트 생성 실패' });
    }
  });
};

export default projectRoutes;
