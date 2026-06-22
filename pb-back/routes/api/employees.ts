import type { FastifyPluginAsync } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sql_con } from '../../lib/db.js';

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

export interface EmployeeDTO {
  id: string;
  name: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  avatar: string | null;
  hireDate: string | null;
  leaveTotal: number;
}

function toEmployeeDTO(row: EmployeeRow): EmployeeDTO {
  return {
    id: String(row.id),
    name: row.name,
    department: row.department,
    position: row.position,
    email: row.email,
    phone: row.phone,
    avatar: row.avatar ?? null,
    hireDate: row.hire_date,
    leaveTotal: Number(row.leave_total ?? 0),
  };
}

const SELECT_COLS =
  "id, name, department, position, email, phone, avatar, DATE_FORMAT(hire_date, '%Y-%m-%d') AS hire_date, leave_total";

// 부분 업데이트 가능한 필드
const FIELDS = ['name', 'department', 'position', 'email', 'phone'] as const;
const cap = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');
const LIMITS: Record<string, number> = {
  name: 100,
  department: 50,
  position: 50,
  email: 255,
  phone: 50,
};

const employeeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/employees', async (request, reply) => {
    try {
      const [rows] = await sql_con
        .promise()
        .query<EmployeeRow[]>(
          `SELECT ${SELECT_COLS} FROM employees ORDER BY department ASC, id ASC`
        );
      return rows.map(toEmployeeDTO);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '직원 목록 조회 실패' });
    }
  });

  fastify.post<{ Body: Record<string, unknown> }>('/employees', async (request, reply) => {
    const b = request.body ?? {};
    const vals = FIELDS.map((f) => cap(b[f], LIMITS[f]));
    try {
      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>(
          `INSERT INTO employees (${FIELDS.join(', ')}) VALUES (${FIELDS.map(() => '?').join(', ')})`,
          vals
        );
      const [rows] = await sql_con
        .promise()
        .query<EmployeeRow[]>(`SELECT ${SELECT_COLS} FROM employees WHERE id = ?`, [
          result.insertId,
        ]);
      if (!rows[0]) {
        return reply.status(500).send({ resultMessage: '생성 후 조회에 실패했습니다.' });
      }
      return reply.status(201).send(toEmployeeDTO(rows[0]));
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '직원 생성 실패' });
    }
  });

  fastify.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/employees/:id',
    async (request, reply) => {
      const id = Number(request.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({ resultMessage: '잘못된 id 입니다.' });
      }
      const b = request.body ?? {};
      const sets: string[] = [];
      const values: unknown[] = [];
      for (const f of FIELDS) {
        if (f in b) {
          sets.push(`${f} = ?`);
          values.push(cap(b[f], LIMITS[f]));
        }
      }
      if ('leaveTotal' in b) {
        const n = Number(b.leaveTotal);
        sets.push('leave_total = ?');
        values.push(Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
      }
      if ('hireDate' in b) {
        const v = b.hireDate;
        sets.push('hire_date = ?');
        values.push(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
      }
      if (sets.length === 0) {
        return reply.status(400).send({ resultMessage: '수정할 필드가 없습니다.' });
      }
      values.push(id);
      try {
        const [result] = await sql_con
          .promise()
          .query<ResultSetHeader>(`UPDATE employees SET ${sets.join(', ')} WHERE id = ?`, values);
        if (result.affectedRows === 0) {
          return reply.status(404).send({ resultMessage: '해당 직원을 찾을 수 없습니다.' });
        }
        const [rows] = await sql_con
          .promise()
          .query<EmployeeRow[]>(`SELECT ${SELECT_COLS} FROM employees WHERE id = ?`, [id]);
        if (!rows[0]) {
          return reply.status(404).send({ resultMessage: '해당 직원을 찾을 수 없습니다.' });
        }
        return toEmployeeDTO(rows[0]);
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '직원 수정 실패' });
      }
    }
  );

  fastify.delete<{ Params: { id: string } }>('/employees/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 id 입니다.' });
    }
    try {
      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>('DELETE FROM employees WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return reply.status(404).send({ resultMessage: '해당 직원을 찾을 수 없습니다.' });
      }
      return reply.status(204).send();
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '직원 삭제 실패' });
    }
  });
};

export default employeeRoutes;
