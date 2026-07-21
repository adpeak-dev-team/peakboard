import type { FastifyPluginAsync } from 'fastify';
import type { RowDataPacket } from 'mysql2';
import { sql_con } from '../../../lib/db.js';

interface UpdateBody {
  n_memo1?: string | null;
  n_memo2?: string | null;
  n_status?: string;
}

const nworkRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (_request, reply) => {
    try {
      const [rows] = await sql_con
        .promise()
        .query<RowDataPacket[]>('SELECT * FROM nwork ORDER BY n_idx');
      return rows;
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ resultMessage: (err as Error).message });
    }
  });

  fastify.patch<{ Body: { idxs?: number[]; n_status?: string } }>(
    '/bulk-status',
    async (request, reply) => {
      const b = request.body ?? {};
      const idxs = Array.isArray(b.idxs)
        ? b.idxs.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0)
        : [];
      const status = typeof b.n_status === 'string' ? b.n_status.trim().slice(0, 50) : '';
      if (idxs.length === 0) {
        return reply.status(400).send({ resultMessage: '대상이 없습니다' });
      }
      if (!status) {
        return reply.status(400).send({ resultMessage: 'n_status 비어있음' });
      }
      try {
        const placeholders = idxs.map(() => '?').join(', ');
        const [result] = await sql_con
          .promise()
          .query(
            `UPDATE nwork SET n_status = ? WHERE n_idx IN (${placeholders})`,
            [status, ...idxs]
          );
        return { updated: (result as { affectedRows?: number }).affectedRows ?? 0 };
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ resultMessage: (err as Error).message });
      }
    }
  );

  fastify.patch<{ Params: { idx: string }; Body: UpdateBody }>(
    '/:idx',
    async (request, reply) => {
      const idx = Number(request.params.idx);
      if (!Number.isInteger(idx) || idx <= 0) {
        return reply.status(400).send({ resultMessage: 'invalid idx' });
      }
      const b = request.body ?? {};
      const fields: string[] = [];
      const values: unknown[] = [];
      const hasKey = (k: keyof UpdateBody) => Object.prototype.hasOwnProperty.call(b, k);

      if (hasKey('n_memo1')) {
        const v = b.n_memo1;
        fields.push('n_memo1 = ?');
        values.push(typeof v === 'string' ? v.slice(0, 255) : null);
      }
      if (hasKey('n_memo2')) {
        const v = b.n_memo2;
        fields.push('n_memo2 = ?');
        values.push(typeof v === 'string' ? v.slice(0, 255) : null);
      }
      if (hasKey('n_status')) {
        const v = typeof b.n_status === 'string' ? b.n_status.trim().slice(0, 50) : '';
        if (!v) return reply.status(400).send({ resultMessage: 'n_status 비어있음' });
        fields.push('n_status = ?');
        values.push(v);
      }

      if (fields.length === 0) {
        return reply.status(400).send({ resultMessage: '수정할 필드가 없습니다' });
      }

      values.push(idx);
      try {
        await sql_con
          .promise()
          .query(`UPDATE nwork SET ${fields.join(', ')} WHERE n_idx = ?`, values);
        const [rows] = await sql_con
          .promise()
          .query<RowDataPacket[]>('SELECT * FROM nwork WHERE n_idx = ?', [idx]);
        return rows[0] ?? null;
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ resultMessage: (err as Error).message });
      }
    }
  );
};

export default nworkRoutes;
