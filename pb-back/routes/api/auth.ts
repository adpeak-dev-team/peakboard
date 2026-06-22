import type { FastifyPluginAsync } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sql_con } from '../../lib/db.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { SESSION_COOKIE, sessionCookieOptions, readSession } from '../../lib/auth.js';

interface UserRow extends RowDataPacket {
  id: number | string;
  email: string;
  name: string;
  password_hash: string | null;
  role: 'admin' | 'member';
  employee_id: number | string | null;
}

interface EmployeeRow extends RowDataPacket {
  id: number | string;
  name: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  avatar: string | null;
  hire_date: string | null;
  leave_total: number;
}

const EMP_COLS =
  "id, name, department, position, email, phone, avatar, DATE_FORMAT(hire_date, '%Y-%m-%d') AS hire_date, leave_total";

function toEmployeeDTO(r: EmployeeRow) {
  return {
    id: String(r.id),
    name: r.name,
    department: r.department,
    position: r.position,
    email: r.email,
    phone: r.phone,
    avatar: r.avatar ?? null,
    hireDate: r.hire_date,
    leaveTotal: Number(r.leave_total ?? 0),
  };
}

// 로그인 사용자 + 연결된 직원(HR) 정보
async function fetchAuthUser(userId: number) {
  const [urows] = await sql_con
    .promise()
    .query<UserRow[]>(
      'SELECT id, email, name, password_hash, role, employee_id FROM users WHERE id = ?',
      [userId]
    );
  const u = urows[0];
  if (!u) return null;
  let employee = null;
  if (u.employee_id != null) {
    const [erows] = await sql_con
      .promise()
      .query<EmployeeRow[]>(`SELECT ${EMP_COLS} FROM employees WHERE id = ?`, [u.employee_id]);
    if (erows[0]) employee = toEmployeeDTO(erows[0]);
  }
  return { id: String(u.id), email: u.email, name: u.name, role: u.role, employee };
}

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // 회원가입: 계정 + (연결할 직원 없으면) 직원 생성. 첫 가입자는 admin.
  fastify.post<{ Body: Record<string, unknown> }>('/auth/signup', async (request, reply) => {
    const b = request.body ?? {};
    const email = str(b.email, 255).toLowerCase();
    const name = str(b.name, 100);
    const password = typeof b.password === 'string' ? b.password : '';
    const department = str(b.department, 50);
    const position = str(b.position, 50);
    if (!email || !name || password.length < 4) {
      return reply
        .status(400)
        .send({ resultMessage: '이메일/이름/비밀번호(4자 이상)를 확인해주세요.' });
    }
    try {
      const [dup] = await sql_con
        .promise()
        .query<UserRow[]>('SELECT id FROM users WHERE email = ?', [email]);
      if (dup[0]) return reply.status(409).send({ resultMessage: '이미 가입된 이메일입니다.' });

      const [cnt] = await sql_con
        .promise()
        .query<RowDataPacket[]>('SELECT COUNT(*) AS c FROM users');
      const role = Number(cnt[0].c) === 0 ? 'admin' : 'member';

      // 같은 이메일의 직원이 있으면 연결, 없으면 새 직원 생성
      const [existEmp] = await sql_con
        .promise()
        .query<EmployeeRow[]>('SELECT id FROM employees WHERE email = ? LIMIT 1', [email]);
      let employeeId: number;
      if (existEmp[0]) {
        employeeId = Number(existEmp[0].id);
      } else {
        const [ins] = await sql_con
          .promise()
          .query<ResultSetHeader>(
            'INSERT INTO employees (name, department, position, email) VALUES (?, ?, ?, ?)',
            [name, department, position, email]
          );
        employeeId = ins.insertId;
      }

      const [u] = await sql_con
        .promise()
        .query<ResultSetHeader>(
          'INSERT INTO users (email, name, password_hash, role, employee_id) VALUES (?, ?, ?, ?, ?)',
          [email, name, hashPassword(password), role, employeeId]
        );
      reply.setCookie(SESSION_COOKIE, String(u.insertId), sessionCookieOptions);
      return reply.status(201).send(await fetchAuthUser(u.insertId));
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '회원가입에 실패했습니다.' });
    }
  });

  // 로그인
  fastify.post<{ Body: Record<string, unknown> }>('/auth/login', async (request, reply) => {
    const b = request.body ?? {};
    const email = str(b.email, 255).toLowerCase();
    const password = typeof b.password === 'string' ? b.password : '';
    if (!email || !password) {
      return reply.status(400).send({ resultMessage: '이메일과 비밀번호를 입력해주세요.' });
    }
    try {
      const [rows] = await sql_con
        .promise()
        .query<UserRow[]>('SELECT id, password_hash FROM users WHERE email = ?', [email]);
      const row = rows[0];
      if (!row || !verifyPassword(password, row.password_hash)) {
        return reply
          .status(401)
          .send({ resultMessage: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }
      reply.setCookie(SESSION_COOKIE, String(row.id), sessionCookieOptions);
      return await fetchAuthUser(Number(row.id));
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '로그인에 실패했습니다.' });
    }
  });

  // 로그아웃
  fastify.post('/auth/logout', async (_request, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  // 현재 로그인 사용자
  fastify.get('/auth/me', async (request, reply) => {
    const uid = readSession(request);
    if (!uid) return reply.status(401).send({ resultMessage: '로그인이 필요합니다.' });
    const user = await fetchAuthUser(uid);
    if (!user) {
      reply.clearCookie(SESSION_COOKIE, { path: '/' });
      return reply.status(401).send({ resultMessage: '로그인이 필요합니다.' });
    }
    return user;
  });

  // 내 프로필 수정 (이름/부서/직급/연락처/아바타) — 본인 계정의 직원 정보만
  fastify.patch<{ Body: Record<string, unknown> }>('/auth/profile', async (request, reply) => {
    const uid = readSession(request);
    if (!uid) return reply.status(401).send({ resultMessage: '로그인이 필요합니다.' });
    const b = request.body ?? {};
    try {
      const [urows] = await sql_con
        .promise()
        .query<UserRow[]>('SELECT employee_id FROM users WHERE id = ?', [uid]);
      const employeeId = urows[0]?.employee_id;
      if (employeeId == null) {
        return reply.status(400).send({ resultMessage: '연결된 직원 정보가 없습니다.' });
      }
      const sets: string[] = [];
      const vals: unknown[] = [];
      const textFields: Array<['name' | 'department' | 'position' | 'phone', number]> = [
        ['name', 100],
        ['department', 50],
        ['position', 50],
        ['phone', 50],
      ];
      for (const [f, n] of textFields) {
        if (f in b) {
          sets.push(`${f} = ?`);
          vals.push(str(b[f], n));
        }
      }
      if ('avatar' in b) {
        const v = b.avatar;
        // data URL(이미지) 또는 비우기(null)만 허용
        sets.push('avatar = ?');
        vals.push(typeof v === 'string' && v.startsWith('data:image/') ? v : null);
      }
      if (sets.length === 0) {
        return reply.status(400).send({ resultMessage: '수정할 내용이 없습니다.' });
      }
      vals.push(employeeId);
      await sql_con
        .promise()
        .query(`UPDATE employees SET ${sets.join(', ')} WHERE id = ?`, vals);
      // 이름이 바뀌면 계정 표시 이름도 동기화
      if ('name' in b) {
        await sql_con
          .promise()
          .query('UPDATE users SET name = ? WHERE id = ?', [str(b.name, 100), uid]);
      }
      return await fetchAuthUser(uid);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '프로필 수정에 실패했습니다.' });
    }
  });

  // 비밀번호 변경
  fastify.post<{ Body: Record<string, unknown> }>('/auth/password', async (request, reply) => {
    const uid = readSession(request);
    if (!uid) return reply.status(401).send({ resultMessage: '로그인이 필요합니다.' });
    const b = request.body ?? {};
    const current = typeof b.currentPassword === 'string' ? b.currentPassword : '';
    const next = typeof b.newPassword === 'string' ? b.newPassword : '';
    if (next.length < 4) {
      return reply.status(400).send({ resultMessage: '새 비밀번호는 4자 이상이어야 합니다.' });
    }
    try {
      const [rows] = await sql_con
        .promise()
        .query<UserRow[]>('SELECT password_hash FROM users WHERE id = ?', [uid]);
      if (!rows[0] || !verifyPassword(current, rows[0].password_hash)) {
        return reply.status(401).send({ resultMessage: '현재 비밀번호가 올바르지 않습니다.' });
      }
      await sql_con
        .promise()
        .query('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(next), uid]);
      return { ok: true };
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '비밀번호 변경에 실패했습니다.' });
    }
  });
};

export default authRoutes;
