import type { FastifyRequest, FastifyReply } from 'fastify';
import type { RowDataPacket } from 'mysql2';
import { sql_con } from './db.js';

export const SESSION_COOKIE = 'session';

export const sessionCookieOptions = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  path: '/',
  signed: true as const,
  // 로그아웃 전까지 유지 (사실상 무기한 — 10년). 로그아웃 시 clearCookie 로 제거.
  maxAge: 60 * 60 * 24 * 365 * 10,
};

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: { id: number; role: 'admin' | 'member' };
  }
}

// 서명된 세션 쿠키에서 userId 추출 (없거나 위조면 null)
export function readSession(req: FastifyRequest): number | null {
  const raw = (req.cookies as Record<string, string | undefined>)?.[SESSION_COOKIE];
  if (!raw) return null;
  const unsigned = req.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return null;
  const n = Number(unsigned.value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// preHandler: 로그인 필요. 통과 시 req.authUser 설정.
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const uid = readSession(req);
  if (!uid) return reply.status(401).send({ resultMessage: '로그인이 필요합니다.' });
  const [rows] = await sql_con
    .promise()
    .query<RowDataPacket[]>('SELECT id, role FROM users WHERE id = ?', [uid]);
  if (!rows[0]) {
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return reply.status(401).send({ resultMessage: '로그인이 필요합니다.' });
  }
  req.authUser = { id: uid, role: rows[0].role as 'admin' | 'member' };
}

// preHandler: 관리자 전용 (requireAuth 이후에 사용)
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  if (!req.authUser || req.authUser.role !== 'admin') {
    return reply.status(403).send({ resultMessage: '관리자 권한이 필요합니다.' });
  }
}
