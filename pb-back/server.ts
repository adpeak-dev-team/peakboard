import fastify from 'fastify';
import path from 'path';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';

dotenv.config();

const app = fastify({ logger: true });

const port = Number(process.env.PORT || 4000);

app.register(cors, {
  origin: true,
  credentials: true,
});

app.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET,
});

app.register(fastifyStatic, {
  root: path.join(process.cwd(), 'public'),
  prefix: '/',
});
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