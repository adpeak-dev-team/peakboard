import type { FastifyPluginAsync } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sql_con } from '../../lib/db.js';

interface ColumnOptionRow extends RowDataPacket {
  id: number | string;
  column_key: string;
  value: string;
  color: string;
  position: number;
}

export interface ColumnOptionDTO {
  id: string;
  columnKey: string;
  value: string;
  color: string;
  position: number;
}

function toDTO(row: ColumnOptionRow): ColumnOptionDTO {
  return {
    id: String(row.id),
    columnKey: row.column_key,
    value: row.value,
    color: row.color,
    position: row.position,
  };
}

const SELECT = 'id, column_key, value, color, position';

const columnOptionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { boardId: string } }>(
    '/boards/:boardId/column-options',
    async (request, reply) => {
      const boardId = Number(request.params.boardId);
      if (!Number.isInteger(boardId) || boardId <= 0) {
        return reply.status(400).send({ resultMessage: '잘못된 boardId 입니다.' });
      }
      try {
        const [rows] = await sql_con
          .promise()
          .query<ColumnOptionRow[]>(
            `SELECT ${SELECT} FROM column_options WHERE board_id = ? ORDER BY column_key, position, id`,
            [boardId]
          );
        return rows.map(toDTO);
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '컬럼 옵션 조회 실패' });
      }
    }
  );

  // 업서트: (board, column, value) 기준으로 색상/순서 갱신 또는 추가
  fastify.put<{
    Params: { boardId: string };
    Body: { columnKey?: unknown; value?: unknown; color?: unknown; position?: unknown };
  }>('/boards/:boardId/column-options', async (request, reply) => {
    const boardId = Number(request.params.boardId);
    if (!Number.isInteger(boardId) || boardId <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 boardId 입니다.' });
    }
    const b = request.body ?? {};
    const columnKey = typeof b.columnKey === 'string' ? b.columnKey.slice(0, 40) : '';
    const value = typeof b.value === 'string' ? b.value.trim().slice(0, 100) : '';
    const color = typeof b.color === 'string' ? b.color.slice(0, 80) : '';
    const position = Number.isFinite(Number(b.position)) ? Number(b.position) : 0;
    if (!columnKey || !value) {
      return reply.status(400).send({ resultMessage: 'columnKey 와 value 가 필요합니다.' });
    }
    try {
      await sql_con
        .promise()
        .query<ResultSetHeader>(
          `INSERT INTO column_options (board_id, column_key, value, color, position)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE color = VALUES(color), position = VALUES(position)`,
          [boardId, columnKey, value, color, position]
        );
      const [rows] = await sql_con
        .promise()
        .query<ColumnOptionRow[]>(
          `SELECT ${SELECT} FROM column_options WHERE board_id = ? AND column_key = ? AND value = ?`,
          [boardId, columnKey, value]
        );
      if (!rows[0]) {
        return reply.status(500).send({ resultMessage: '저장 후 조회에 실패했습니다.' });
      }
      return toDTO(rows[0]);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '컬럼 옵션 저장 실패' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/column-options/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 id 입니다.' });
    }
    try {
      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>('DELETE FROM column_options WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return reply.status(404).send({ resultMessage: '해당 옵션을 찾을 수 없습니다.' });
      }
      return reply.status(204).send();
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '컬럼 옵션 삭제 실패' });
    }
  });
};

export default columnOptionRoutes;
