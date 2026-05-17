import type { FastifyPluginAsync } from 'fastify';

const apiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/test', async () => {
    return { ok: true, message: 'API 테스트 라우터 정상 동작!' };
  });
};

export default apiRoutes;
