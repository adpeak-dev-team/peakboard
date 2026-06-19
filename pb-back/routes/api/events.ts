import type { FastifyPluginAsync } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sql_con } from '../../lib/db.js';

type EventCategory = 'leave' | 'company' | 'holiday' | 'todo';

interface EventRow extends RowDataPacket {
  id: number | string;
  event_date: string;
  category: EventCategory;
  title: string;
  done: number;
}

export interface EventDTO {
  id: string;
  date: string; // 'YYYY-MM-DD'
  category: EventCategory;
  title: string;
  done: boolean;
}

function toEventDTO(row: EventRow): EventDTO {
  return {
    id: String(row.id),
    date: row.event_date,
    category: row.category,
    title: row.title,
    done: !!row.done,
  };
}

const SELECT_COLS =
  "id, DATE_FORMAT(event_date, '%Y-%m-%d') AS event_date, category, title, done";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const normCategory = (v: unknown): EventCategory =>
  v === 'leave' ? 'leave' : v === 'holiday' ? 'holiday' : v === 'todo' ? 'todo' : 'company';

const eventRoutes: FastifyPluginAsync = async (fastify) => {
  // 전체 일정 목록
  fastify.get('/events', async (request, reply) => {
    try {
      const [rows] = await sql_con
        .promise()
        .query<EventRow[]>(
          `SELECT ${SELECT_COLS} FROM company_events ORDER BY event_date ASC, id ASC`
        );
      return rows.map(toEventDTO);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '일정 목록 조회 실패' });
    }
  });

  // 일정 생성
  fastify.post<{ Body: { date?: unknown; category?: unknown; title?: unknown } }>(
    '/events',
    async (request, reply) => {
      const b = request.body ?? {};
      const date = typeof b.date === 'string' && DATE_RE.test(b.date) ? b.date : '';
      if (!date) return reply.status(400).send({ resultMessage: '날짜(date)가 필요합니다.' });
      const category = normCategory(b.category);
      const title = typeof b.title === 'string' ? b.title.slice(0, 255) : '';
      try {
        const [result] = await sql_con
          .promise()
          .query<ResultSetHeader>(
            'INSERT INTO company_events (event_date, category, title) VALUES (?, ?, ?)',
            [date, category, title]
          );
        const dto: EventDTO = { id: String(result.insertId), date, category, title, done: false };
        return reply.status(201).send(dto);
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '일정 생성 실패' });
      }
    }
  );

  // 일정 수정
  fastify.patch<{
    Params: { id: string };
    Body: { date?: unknown; category?: unknown; title?: unknown; done?: unknown };
  }>('/events/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 id 입니다.' });
    }
    const b = request.body ?? {};
    const sets: string[] = [];
    const values: unknown[] = [];
    if (typeof b.date === 'string' && DATE_RE.test(b.date)) {
      sets.push('event_date = ?');
      values.push(b.date);
    }
    if (b.category !== undefined) {
      sets.push('category = ?');
      values.push(normCategory(b.category));
    }
    if (typeof b.title === 'string') {
      sets.push('title = ?');
      values.push(b.title.slice(0, 255));
    }
    if ('done' in b) {
      sets.push('done = ?');
      values.push(b.done ? 1 : 0);
    }
    if (sets.length === 0) {
      return reply.status(400).send({ resultMessage: '수정할 필드가 없습니다.' });
    }
    values.push(id);
    try {
      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>(
          `UPDATE company_events SET ${sets.join(', ')} WHERE id = ?`,
          values
        );
      if (result.affectedRows === 0) {
        return reply.status(404).send({ resultMessage: '해당 일정을 찾을 수 없습니다.' });
      }
      const [rows] = await sql_con
        .promise()
        .query<EventRow[]>(`SELECT ${SELECT_COLS} FROM company_events WHERE id = ?`, [id]);
      return toEventDTO(rows[0]);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '일정 수정 실패' });
    }
  });

  // 일정 삭제
  fastify.delete<{ Params: { id: string } }>('/events/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 id 입니다.' });
    }
    try {
      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>('DELETE FROM company_events WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return reply.status(404).send({ resultMessage: '해당 일정을 찾을 수 없습니다.' });
      }
      return reply.status(204).send();
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '일정 삭제 실패' });
    }
  });
};

export default eventRoutes;
