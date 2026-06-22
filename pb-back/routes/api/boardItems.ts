import type { FastifyPluginAsync } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sql_con } from '../../lib/db.js';

interface BoardItemRow extends RowDataPacket {
  id: number | string;
  board_id: number | string;
  project_id: number | string | null;
  title: string;
  group_key: string;
  event_date: string | null;
  assignee: string;
  notes: string | null;
  done: number;
  fields: unknown;
  position: number;
}

export interface BoardItemDTO {
  id: string;
  boardId: string;
  projectId: string | null;
  title: string;
  groupKey: string;
  eventDate: string | null;
  assignee: string;
  notes: string;
  done: boolean;
  fields: Record<string, string>;
  position: number;
}

function parseFields(raw: unknown): Record<string, string> {
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return {};
    }
  }
  return raw as Record<string, string>;
}

function toBoardItemDTO(row: BoardItemRow): BoardItemDTO {
  return {
    id: String(row.id),
    boardId: String(row.board_id),
    projectId: row.project_id == null ? null : String(row.project_id),
    title: row.title,
    groupKey: row.group_key,
    eventDate: row.event_date,
    assignee: row.assignee,
    notes: row.notes ?? '',
    done: !!row.done,
    fields: parseFields(row.fields),
    position: row.position,
  };
}

// 조회 시 DATE 컬럼을 'YYYY-MM-DD' 문자열로 받기 위해 DATE_FORMAT 사용 (TZ 시프트 방지)
const SELECT_COLS =
  "id, board_id, project_id, title, group_key, DATE_FORMAT(event_date, '%Y-%m-%d') AS event_date, assignee, notes, done, fields, position";

function normProjectId(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// PATCH 가능한 필드 정의: 입력 키 → 컬럼명 + 정규화 함수
type Normalizer = (v: unknown) => unknown;
const PATCHABLE: Record<string, { col: string; norm: Normalizer }> = {
  projectId: { col: 'project_id', norm: (v) => normProjectId(v) },
  title: { col: 'title', norm: (v) => (typeof v === 'string' ? v.slice(0, 255) : '') },
  groupKey: { col: 'group_key', norm: (v) => (typeof v === 'string' ? v.slice(0, 40) : '') },
  eventDate: {
    col: 'event_date',
    norm: (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null),
  },
  assignee: { col: 'assignee', norm: (v) => (typeof v === 'string' ? v.slice(0, 100) : '') },
  notes: { col: 'notes', norm: (v) => (typeof v === 'string' ? v : '') },
  done: { col: 'done', norm: (v) => (v ? 1 : 0) },
  position: { col: 'position', norm: (v) => (Number.isFinite(Number(v)) ? Number(v) : 0) },
  fields: {
    col: 'fields',
    norm: (v) => (v && typeof v === 'object' ? JSON.stringify(v) : '{}'),
  },
};

const boardItemRoutes: FastifyPluginAsync = async (fastify) => {
  // 보드의 아이템 목록
  fastify.get<{ Params: { boardId: string } }>(
    '/boards/:boardId/items',
    async (request, reply) => {
      const boardId = Number(request.params.boardId);
      if (!Number.isInteger(boardId) || boardId <= 0) {
        return reply.status(400).send({ resultMessage: '잘못된 boardId 입니다.' });
      }
      try {
        const [rows] = await sql_con
          .promise()
          .query<BoardItemRow[]>(
            `SELECT ${SELECT_COLS} FROM board_items WHERE board_id = ? ORDER BY position ASC, id ASC`,
            [boardId]
          );
        return rows.map(toBoardItemDTO);
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '아이템 목록 조회 실패' });
      }
    }
  );

  // 아이템 생성
  fastify.post<{
    Params: { boardId: string };
    Body: {
      projectId?: unknown;
      title?: unknown;
      groupKey?: unknown;
      eventDate?: unknown;
      assignee?: unknown;
      notes?: unknown;
      fields?: unknown;
    };
  }>('/boards/:boardId/items', async (request, reply) => {
    const boardId = Number(request.params.boardId);
    if (!Number.isInteger(boardId) || boardId <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 boardId 입니다.' });
    }
    const b = request.body ?? {};
    const projectId = normProjectId(b.projectId);
    const title = typeof b.title === 'string' ? b.title.slice(0, 255) : '';
    const groupKey = typeof b.groupKey === 'string' ? b.groupKey.slice(0, 40) : '';
    const eventDate =
      typeof b.eventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.eventDate)
        ? b.eventDate
        : null;
    const assignee = typeof b.assignee === 'string' ? b.assignee.slice(0, 100) : '';
    const notes = typeof b.notes === 'string' ? b.notes : '';
    const fields = b.fields && typeof b.fields === 'object' ? JSON.stringify(b.fields) : '{}';

    try {
      // position 은 같은 그룹의 마지막 다음으로
      const [maxRows] = await sql_con
        .promise()
        .query<RowDataPacket[]>(
          'SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM board_items WHERE board_id = ? AND group_key = ?',
          [boardId, groupKey]
        );
      const position = Number(maxRows[0]?.pos ?? 0);

      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>(
          'INSERT INTO board_items (board_id, project_id, title, group_key, event_date, assignee, notes, fields, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [boardId, projectId, title, groupKey, eventDate, assignee, notes, fields, position]
        );

      const [rows] = await sql_con
        .promise()
        .query<BoardItemRow[]>(`SELECT ${SELECT_COLS} FROM board_items WHERE id = ?`, [
          result.insertId,
        ]);
      if (!rows[0]) {
        return reply.status(500).send({ resultMessage: '생성 후 조회에 실패했습니다.' });
      }
      return reply.status(201).send(toBoardItemDTO(rows[0]));
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '아이템 생성 실패' });
    }
  });

  // 아이템 수정 (부분 업데이트)
  fastify.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/board-items/:id',
    async (request, reply) => {
      const id = Number(request.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({ resultMessage: '잘못된 id 입니다.' });
      }
      const patch = request.body ?? {};
      const sets: string[] = [];
      const values: unknown[] = [];
      for (const [key, spec] of Object.entries(PATCHABLE)) {
        if (key in patch) {
          sets.push(`${spec.col} = ?`);
          values.push(spec.norm(patch[key]));
        }
      }
      if (sets.length === 0) {
        return reply.status(400).send({ resultMessage: '수정할 필드가 없습니다.' });
      }
      values.push(id);
      try {
        const [result] = await sql_con
          .promise()
          .query<ResultSetHeader>(
            `UPDATE board_items SET ${sets.join(', ')} WHERE id = ?`,
            values
          );
        if (result.affectedRows === 0) {
          return reply.status(404).send({ resultMessage: '해당 아이템을 찾을 수 없습니다.' });
        }
        const [rows] = await sql_con
          .promise()
          .query<BoardItemRow[]>(`SELECT ${SELECT_COLS} FROM board_items WHERE id = ?`, [id]);
        if (!rows[0]) {
          return reply.status(404).send({ resultMessage: '해당 아이템을 찾을 수 없습니다.' });
        }
        return toBoardItemDTO(rows[0]);
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ resultMessage: '아이템 수정 실패' });
      }
    }
  );

  // 정렬/그룹 일괄 변경: 대상 그룹의 순서대로 position 재할당 + group_key 설정
  fastify.put<{
    Params: { boardId: string };
    Body: { groupKey?: unknown; orderedIds?: unknown };
  }>('/boards/:boardId/reorder', async (request, reply) => {
    const boardId = Number(request.params.boardId);
    if (!Number.isInteger(boardId) || boardId <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 boardId 입니다.' });
    }
    const groupKey =
      typeof request.body?.groupKey === 'string' ? request.body.groupKey.slice(0, 40) : '';
    const rawIds = request.body?.orderedIds;
    if (!Array.isArray(rawIds)) {
      return reply.status(400).send({ resultMessage: 'orderedIds 배열이 필요합니다.' });
    }
    const ids = rawIds.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) {
      return reply.status(204).send();
    }

    const conn = await sql_con.promise().getConnection();
    try {
      await conn.beginTransaction();
      await Promise.all(
        ids.map((id, idx) =>
          conn.query(
            'UPDATE board_items SET group_key = ?, position = ? WHERE id = ? AND board_id = ?',
            [groupKey, idx, id, boardId]
          )
        )
      );
      await conn.commit();
      return reply.status(204).send();
    } catch (err) {
      await conn.rollback();
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '순서 변경 실패' });
    } finally {
      conn.release();
    }
  });

  // 아이템 삭제
  fastify.delete<{ Params: { id: string } }>('/board-items/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.status(400).send({ resultMessage: '잘못된 id 입니다.' });
    }
    try {
      const [result] = await sql_con
        .promise()
        .query<ResultSetHeader>('DELETE FROM board_items WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return reply.status(404).send({ resultMessage: '해당 아이템을 찾을 수 없습니다.' });
      }
      return reply.status(204).send();
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ resultMessage: '아이템 삭제 실패' });
    }
  });
};

export default boardItemRoutes;
