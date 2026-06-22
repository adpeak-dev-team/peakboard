import type { FastifyPluginAsync } from 'fastify';
import { sql_con } from '../lib/db.js';
import boardRoutes from './api/boards.js';
import boardItemRoutes from './api/boardItems.js';
import projectRoutes from './api/projects.js';
import eventRoutes from './api/events.js';
import employeeRoutes from './api/employees.js';
import leaveRoutes from './api/leave.js';
import columnOptionRoutes from './api/columnOptions.js';

const apiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/test', async () => {
    return { ok: true, message: 'API 테스트 라우터 정상 동작!' };
  });

  fastify.get('/db-test', async (request, reply) => {
    try {
      const [rows] = await sql_con
        .promise()
        .query('SELECT NOW() AS now, DATABASE() AS db, VERSION() AS version');
      return { ok: true, data: rows };
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ ok: false, error: (err as Error).message });
    }
  });

  await fastify.register(boardRoutes);
  await fastify.register(projectRoutes);
  await fastify.register(boardItemRoutes);
  await fastify.register(eventRoutes);
  await fastify.register(employeeRoutes);
  await fastify.register(leaveRoutes);
  await fastify.register(columnOptionRoutes);
};

export default apiRoutes;
