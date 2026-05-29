import type { FastifyPluginAsync } from 'fastify';
import { sql_con } from '../lib/db.js';
import projectRoutes from './api/projects.js';
import taskRoutes from './api/tasks.js';
import folderRoutes from './api/folders.js';
import todoRoutes from './api/todos.js';
import documentRoutes from './api/documents.js';

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

  await fastify.register(projectRoutes);
  await fastify.register(taskRoutes);
  await fastify.register(folderRoutes);
  await fastify.register(todoRoutes);
  await fastify.register(documentRoutes);
};

export default apiRoutes;
