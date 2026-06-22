import type { FastifyPluginAsync } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sql_con } from '../../lib/db.js';

interface LeaveRow extends RowDataPacket {
  id: number | string;
  employee_id: number | string;
  employee_name: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface LeaveRequestDTO {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

function toDTO(row: LeaveRow): LeaveRequestDTO {
  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    employeeName: row.employee_name ?? '',
    startDate: row.start_date,
    endDate: row.end_date,
    days: Number(row.days),
    reason: row.reason,
    status: row.status,
  };
}

const SELECT = `
  SELECT lr.id, lr.employee_id, e.name AS employee_name,
         DATE_FORMAT(lr.start_date, '%Y-%m-%d') AS start_date,
         DATE_FORMAT(lr.end_date, '%Y-%m-%d') AS end_date,
         lr.days, lr.reason, lr.status
  FROM leave_requests lr
  LEFT JOIN employees e ON e.id = lr.employee_id`;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const leaveRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/leave-requests', async (request, reply) => {
    try {
      const [rows] = await sql_con
        .promise()
        .query<LeaveRow[]>(`${SELECT} ORDER BY lr.start_date DESC, lr.id DESC`);
      return rows.map(toDTO);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '연차 목록 조회 실패' });
    }
  });

  fastify.post<{
    Body: {
      employeeId?: unknown;
      startDate?: unknown;
      endDate?: unknown;
      days?: unknown;
      reason?: unknown;
    };
  }>('/leave-requests', async (request, reply) => {
    const b = request.body ?? {};
    const employeeId = Number(b.employeeId);
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return reply.status(400).send({ resultMessage: '직원을 선택해주세요.' });
    }
    const startDate = typeof b.startDate === 'string' && DATE_RE.test(b.startDate) ? b.startDate : '';
    const endDate =
      typeof b.endDate === 'string' && DATE_RE.test(b.endDate) ? b.endDate : startDate;
    if (!startDate) return reply.status(400).send({ resultMessage: '시작일이 필요합니다.' });
    if (endDate < startDate) {
      return reply.status(400).send({ resultMessage: '종료일이 시작일보다 빠를 수 없습니다.' });
    }
    const days = Number.isFinite(Number(b.days)) && Number(b.days) > 0 ? Math.floor(Number(b.days)) : 1;
    const reason = typeof b.reason === 'string' ? b.reason.slice(0, 255) : '';
    try {
      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>(
          'INSERT INTO leave_requests (employee_id, start_date, end_date, days, reason) VALUES (?, ?, ?, ?, ?)',
          [employeeId, startDate, endDate, days, reason]
        );
      const [rows] = await sql_con
        .promise()
        .query<LeaveRow[]>(`${SELECT} WHERE lr.id = ?`, [result.insertId]);
      if (!rows[0]) {
        return reply.status(500).send({ resultMessage: '신청 후 조회에 실패했습니다.' });
      }
      return reply.status(201).send(toDTO(rows[0]));
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '연차 신청 실패' });
    }
  });

  fastify.patch<{ Params: { id: string }; Body: { status?: unknown } }>(
    '/leave-requests/:id',
    async (request, reply) => {
      const id = Number(request.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({ resultMessage: '잘못된 id 입니다.' });
      }
      const status = request.body?.status;
      if (status !== 'pending' && status !== 'approved' && status !== 'rejected') {
        return reply.status(400).send({ resultMessage: '잘못된 상태입니다.' });
      }
      try {
        const [result] = await sql_con
          .promise()
          .query<ResultSetHeader>('UPDATE leave_requests SET status = ? WHERE id = ?', [status, id]);
        if (result.affectedRows === 0) {
          return reply.status(404).send({ resultMessage: '해당 신청을 찾을 수 없습니다.' });
        }
        const [rows] = await sql_con.promise().query<LeaveRow[]>(`${SELECT} WHERE lr.id = ?`, [id]);
        if (!rows[0]) {
          return reply.status(404).send({ resultMessage: '해당 신청을 찾을 수 없습니다.' });
        }
        return toDTO(rows[0]);
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '연차 상태 변경 실패' });
      }
    }
  );

  fastify.delete<{ Params: { id: string } }>('/leave-requests/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 id 입니다.' });
    }
    try {
      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>('DELETE FROM leave_requests WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return reply.status(404).send({ resultMessage: '해당 신청을 찾을 수 없습니다.' });
      }
      return reply.status(204).send();
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '연차 삭제 실패' });
    }
  });
};

export default leaveRoutes;
