import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sql_con } from './db.js';

export const SESSION_COOKIE = 'session';

// 개발용 자동 인증. DEV_AUTH_EMAIL 이 설정된 경우에만 켜지며,
// 세션 쿠키가 없는 요청을 이 유저로 간주한다. 프로덕션에서는 env 를 비워두면 자동으로 꺼진다.
let devAuthUid: number | null = null;
export function getDevAuthUid(): number | null {
  return devAuthUid;
}

export async function ensureDevAuthUser(log: (msg: string) => void): Promise<void> {
  const email = process.env.DEV_AUTH_EMAIL?.trim().toLowerCase();
  if (!email) return;
  const [existing] = await sql_con
    .promise()
    .query<RowDataPacket[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing[0]) {
    devAuthUid = Number(existing[0].id);
    log(`[dev-auth] using existing user ${email} (id=${devAuthUid})`);
    return;
  }
  const [emp] = await sql_con
    .promise()
    .query<ResultSetHeader>(
      'INSERT INTO employees (name, department, position, email) VALUES (?, ?, ?, ?)',
      ['dev', '개발', '개발자', email]
    );
  const [u] = await sql_con
    .promise()
    .query<ResultSetHeader>(
      "INSERT INTO users (email, name, password_hash, role, employee_id) VALUES (?, ?, NULL, 'admin', ?)",
      [email, 'dev', emp.insertId]
    );
  devAuthUid = u.insertId;
  log(`[dev-auth] provisioned admin ${email} (id=${devAuthUid})`);
}

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

// 서명된 세션 쿠키에서 userId 추출 (없거나 위조면 null).
// DEV_AUTH_EMAIL 이 세팅된 개발 환경에선 쿠키 없을 때 dev 유저로 폴백한다.
export function readSession(req: FastifyRequest): number | null {
  const raw = (req.cookies as Record<string, string | undefined>)?.[SESSION_COOKIE];
  if (raw) {
    const unsigned = req.unsignCookie(raw);
    if (unsigned.valid && unsigned.value) {
      const n = Number(unsigned.value);
      if (Number.isInteger(n) && n > 0) return n;
    }
  }
  return devAuthUid;
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
