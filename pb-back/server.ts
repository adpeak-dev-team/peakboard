import 'dotenv/config';
import fastify from 'fastify';
import path from 'path';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import apiRoutes from './routes/api.js';

const app = fastify({ logger: true });

const port = Number(process.env.PORT || 3050);

app.register(cors, {
  origin: [
    'http://localhost:3030',
    'http://frontend:3030',
  ],
  credentials: true,
});

app.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET,
});

app.register(fastifyStatic, {
  root: path.join(process.cwd(), 'public'),
  prefix: '/',
});

app.register(apiRoutes, { prefix: '/api' });

app.get('/chkserver', async (request, reply) => {
  return '서버 생성 완료!!!!';
});

const start = async () => {
  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`server running in port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();