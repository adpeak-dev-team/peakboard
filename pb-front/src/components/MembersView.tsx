'use client';

import { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { useEmployeesQuery } from '@/services/work/employees/queries';
import {
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} from '@/services/work/employees/mutations';
import type { EmployeeDTO } from '@/services/work/type';

type Field = 'name' | 'department' | 'position' | 'email' | 'phone';

const COLUMNS: { key: Field; label: string; width: number }[] = [
  { key: 'name', label: '이름', width: 120 },
  { key: 'department', label: '부서', width: 120 },
  { key: 'position', label: '직급', width: 100 },
  { key: 'email', label: '이메일', width: 220 },
  { key: 'phone', label: '연락처', width: 150 },
];

export default function MembersView() {
  const employeesQuery = useEmployeesQuery();
  const employees = employeesQuery.data ?? [];
  const createMutation = useCreateEmployeeMutation();
  const updateMutation = useUpdateEmployeeMutation();
  const deleteMutation = useDeleteEmployeeMutation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handlePatch = (id: string, field: Field, value: string) =>
    updateMutation.mutate(
      { id, patch: { [field]: value } },
      { onError: () => alert('수정에 실패했어요.') }
    );

  const handleAdd = () =>
    createMutation.mutate(
      { name: '', department: '', position: '', email: '', phone: '' },
      { onError: () => alert('직원 추가에 실패했어요.') }
    );

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="w-4 h-4" />
          <span className="text-sm">총 {employees.length}명</span>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
        >
          <Plus className="w-4 h-4" />직원 추가
        </button>
      </div>

      <div className="overflow-auto flex-1 min-h-0 rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  style={{ minWidth: col.width }}
                  className="px-3 py-2 text-xs font-semibold text-gray-500 whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <EmployeeRow
                key={emp.id}
                employee={emp}
                onPatch={handlePatch}
                onDelete={(id) => setDeletingId(id)}
              />
            ))}
          </tbody>
        </table>
        {employees.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            {employeesQuery.isLoading ? '불러오는 중…' : '등록된 직원이 없습니다.'}
          </p>
        )}
      </div>

      <ConfirmModal
        open={!!deletingId}
        title="직원 삭제"
        message="삭제된 데이터는 복구할 수 없습니다."
        onConfirm={() =>
          deletingId &&
          deleteMutation.mutate(deletingId, { onError: () => alert('삭제에 실패했어요.') })
        }
        onClose={() => setDeletingId(null)}
      />
    </div>
  );
}

function EmployeeRow({
  employee,
  onPatch,
  onDelete,
}: {
  employee: EmployeeDTO;
  onPatch: (id: string, field: Field, value: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <tr className="border-b border-gray-100 hover:bg-indigo-50/30">
      {COLUMNS.map((col) => (
        <td key={col.key} className="align-middle">
          <Cell
            value={employee[col.key]}
            onCommit={(v) => onPatch(employee.id, col.key, v)}
          />
        </td>
      ))}
      <td className="text-center align-middle">
        <button
          onClick={() => onDelete(employee.id)}
          className="text-gray-300 hover:text-red-500 transition-colors"
          aria-label="직원 삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

function Cell({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setLocal(value);
  }
  return (
    <input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => local !== value && onCommit(local)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      placeholder="-"
      className="w-full bg-transparent text-sm px-3 py-2 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded"
    />
  );
}
