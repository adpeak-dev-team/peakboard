import type { FastifyPluginAsync } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sql_con } from '../../lib/db.js';
import { requireAdmin } from '../../lib/auth.js';
import { hashPassword } from '../../lib/password.js';

interface EmployeeRow extends RowDataPacket {
  id: number | string;
  name: string;
  email: string;
}

interface UserRow extends RowDataPacket {
  id: number | string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  employee_id: number | string | null;
}

// 관리자 전용: 계정 목록 + 권한 변경
const usersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/users', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const [rows] = await sql_con
        .promise()
        .query<UserRow[]>(
          'SELECT id, email, name, role, employee_id FROM users ORDER BY id ASC'
        );
      return rows.map((r) => ({
        id: String(r.id),
        email: r.email,
        name: r.name,
        role: r.role,
        employeeId: r.employee_id == null ? null : String(r.employee_id),
      }));
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '사용자 목록 조회에 실패했습니다.' });
    }
  });

  // 직원에 대한 로그인 계정 생성 (비밀번호 지정)
  fastify.post<{ Body: Record<string, unknown> }>(
    '/users',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const b = request.body ?? {};
      const employeeId = Number(b.employeeId);
      const password = typeof b.password === 'string' ? b.password : '';
      const role = b.role === 'admin' ? 'admin' : 'member';
      if (!Number.isInteger(employeeId) || employeeId <= 0 || password.length < 4) {
        return reply
          .status(400)
          .send({ resultMessage: '직원과 비밀번호(4자 이상)를 확인해주세요.' });
      }
      try {
        const [emps] = await sql_con
          .promise()
          .query<EmployeeRow[]>('SELECT id, name, email FROM employees WHERE id = ?', [employeeId]);
        const emp = emps[0];
        if (!emp) return reply.status(404).send({ resultMessage: '직원을 찾을 수 없습니다.' });
        if (!emp.email) {
          return reply
            .status(400)
            .send({ resultMessage: '계정을 만들려면 직원 이메일이 필요합니다.' });
        }
        const [dup] = await sql_con
          .promise()
          .query<RowDataPacket[]>(
            'SELECT id FROM users WHERE email = ? OR employee_id = ?',
            [emp.email, employeeId]
          );
        if (dup[0]) return reply.status(409).send({ resultMessage: '이미 계정이 있습니다.' });

        await sql_con
          .promise()
          .query<ResultSetHeader>(
            'INSERT INTO users (email, name, password_hash, role, employee_id) VALUES (?, ?, ?, ?, ?)',
            [emp.email, emp.name, hashPassword(password), role, employeeId]
          );
        return reply.status(201).send({ ok: true });
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '계정 생성에 실패했습니다.' });
      }
    }
  );

  // 비밀번호 설정/초기화
  fastify.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/users/:id/password',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const id = Number(request.params.id);
      const password = typeof request.body?.password === 'string' ? request.body.password : '';
      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({ resultMessage: '잘못된 id 입니다.' });
      }
      if (password.length < 4) {
        return reply.status(400).send({ resultMessage: '비밀번호는 4자 이상이어야 합니다.' });
      }
      try {
        const [result] = await sql_con
          .promise()
          .query<ResultSetHeader>('UPDATE users SET password_hash = ? WHERE id = ?', [
            hashPassword(password),
            id,
          ]);
        if (result.affectedRows === 0) {
          return reply.status(404).send({ resultMessage: '사용자를 찾을 수 없습니다.' });
        }
        return { ok: true };
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '비밀번호 변경에 실패했습니다.' });
      }
    }
  );

  fastify.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/users/:id/role',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const id = Number(request.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({ resultMessage: '잘못된 id 입니다.' });
      }
      const role = request.body?.role;
      if (role !== 'admin' && role !== 'member') {
        return reply.status(400).send({ resultMessage: "role 은 'admin' 또는 'member' 여야 합니다." });
      }
      // 본인 계정의 관리자 권한 해제 방지 (자기 자신 잠금 방지)
      if (role === 'member' && request.authUser?.id === id) {
        return reply
          .status(400)
          .send({ resultMessage: '본인 계정의 관리자 권한은 해제할 수 없습니다.' });
      }
      try {
        const [result] = await sql_con
          .promise()
          .query<ResultSetHeader>('UPDATE users SET role = ? WHERE id = ?', [role, id]);
        if (result.affectedRows === 0) {
          return reply.status(404).send({ resultMessage: '사용자를 찾을 수 없습니다.' });
        }
        return { ok: true, role };
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '권한 변경에 실패했습니다.' });
      }
    }
  );
};

export default usersRoutes;
