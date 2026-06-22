import type { FastifyPluginAsync } from 'fastify';
import { sql_con } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
import authRoutes from './api/auth.js';
import usersRoutes from './api/users.js';
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

  // 공개: 인증 라우터 (로그인/회원가입/로그아웃/me/비번변경)
  await fastify.register(authRoutes);

  // 보호: 로그인 필요한 나머지 API (별도 캡슐화로 preHandler 적용)
  await fastify.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', requireAuth);
    await protectedApp.register(usersRoutes);
    await protectedApp.register(boardRoutes);
    await protectedApp.register(projectRoutes);
    await protectedApp.register(boardItemRoutes);
    await protectedApp.register(eventRoutes);
    await protectedApp.register(employeeRoutes);
    await protectedApp.register(leaveRoutes);
    await protectedApp.register(columnOptionRoutes);
  });
};

export default apiRoutes;
