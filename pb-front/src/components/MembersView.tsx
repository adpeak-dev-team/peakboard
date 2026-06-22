'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, Users, KeyRound, Check } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import Modal from './Modal';
import { useEmployeesQuery } from '@/services/work/employees/queries';
import {
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} from '@/services/work/employees/mutations';
import type { EmployeeDTO } from '@/services/work/type';
import { useUsersQuery } from '@/services/users/queries';
import {
  useUpdateUserRoleMutation,
  useCreateUserAccountMutation,
  useSetUserPasswordMutation,
} from '@/services/users/mutations';
import type { UserAccount } from '@/services/users/api';

// 비밀번호 모달 대상: 계정 생성(직원) 또는 비번 변경(기존 계정)
type PwTarget =
  | { mode: 'create'; employee: EmployeeDTO }
  | { mode: 'set'; user: UserAccount };

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

  // 직원 ↔ 로그인 계정(권한) 매핑
  const usersQuery = useUsersQuery();
  const updateRole = useUpdateUserRoleMutation();
  const userByEmployee = useMemo(() => {
    const m = new Map<string, UserAccount>();
    for (const u of usersQuery.data ?? []) if (u.employeeId) m.set(u.employeeId, u);
    return m;
  }, [usersQuery.data]);

  const handleToggleRole = (user: UserAccount) =>
    updateRole.mutate(
      { id: user.id, role: user.role === 'admin' ? 'member' : 'admin' },
      { onError: (e) => alert((e as Error).message || '권한 변경에 실패했어요.') }
    );

  // 비밀번호 모달 (계정 생성 / 비번 변경)
  const [pwTarget, setPwTarget] = useState<PwTarget | null>(null);
  const createAccount = useCreateUserAccountMutation();
  const setPassword = useSetUserPasswordMutation();

  const handlePwSubmit = (password: string) => {
    if (!pwTarget) return;
    const onError = (e: unknown) => alert((e as Error).message || '처리에 실패했어요.');
    if (pwTarget.mode === 'create') {
      createAccount.mutate(
        { employeeId: pwTarget.employee.id, password },
        { onSuccess: () => setPwTarget(null), onError }
      );
    } else {
      setPassword.mutate(
        { id: pwTarget.user.id, password },
        { onSuccess: () => setPwTarget(null), onError }
      );
    }
  };

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
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 whitespace-nowrap">
                권한
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 whitespace-nowrap">
                비밀번호
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <EmployeeRow
                key={emp.id}
                employee={emp}
                user={userByEmployee.get(emp.id)}
                onPatch={handlePatch}
                onToggleRole={handleToggleRole}
                onOpenPassword={setPwTarget}
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

      {pwTarget && (
        <PasswordModal
          target={pwTarget}
          onClose={() => setPwTarget(null)}
          onSubmit={handlePwSubmit}
        />
      )}
    </div>
  );
}

function PasswordModal({
  target,
  onClose,
  onSubmit,
}: {
  target: PwTarget;
  onClose: () => void;
  onSubmit: (password: string) => void;
}) {
  const [pw, setPw] = useState('');
  const isCreate = target.mode === 'create';
  const who = isCreate
    ? target.employee.name || target.employee.email
    : target.user.name || target.user.email;
  const save = () => {
    if (pw.length < 4) {
      alert('비밀번호는 4자 이상이어야 합니다.');
      return;
    }
    onSubmit(pw);
  };
  return (
    <Modal open title={isCreate ? '계정 만들기' : '비밀번호 변경'} onClose={onClose} width="max-w-sm">
      <p className="text-sm text-gray-500 mb-3">
        <span className="font-semibold text-gray-700">{who}</span>
        {isCreate ? ' 직원의 로그인 계정을 만듭니다.' : ' 계정의 비밀번호를 변경합니다.'}
      </p>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {isCreate ? '비밀번호' : '새 비밀번호'}
      </label>
      <input
        type="password"
        autoFocus
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        placeholder="4자 이상"
        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
      <div className="flex justify-end mt-5">
        <button
          onClick={save}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
        >
          <Check className="w-4 h-4" />
          {isCreate ? '생성' : '변경'}
        </button>
      </div>
    </Modal>
  );
}

function EmployeeRow({
  employee,
  user,
  onPatch,
  onToggleRole,
  onOpenPassword,
  onDelete,
}: {
  employee: EmployeeDTO;
  user?: UserAccount;
  onPatch: (id: string, field: Field, value: string) => void;
  onToggleRole: (user: UserAccount) => void;
  onOpenPassword: (target: PwTarget) => void;
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
      <td className="text-center align-middle px-3">
        {user ? (
          <button
            onClick={() => onToggleRole(user)}
            title="클릭하여 권한 변경"
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
              user.role === 'admin'
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {user.role === 'admin' ? '관리자' : '일반'}
          </button>
        ) : (
          <span className="text-xs text-gray-300">계정 없음</span>
        )}
      </td>
      <td className="px-3 align-middle whitespace-nowrap">
        {user ? (
          <button
            onClick={() => onOpenPassword({ mode: 'set', user })}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
          >
            <KeyRound className="w-3.5 h-3.5" />비번 변경
          </button>
        ) : employee.email ? (
          <button
            onClick={() => onOpenPassword({ mode: 'create', employee })}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50"
          >
            <KeyRound className="w-3.5 h-3.5" />계정 만들기
          </button>
        ) : (
          <span className="text-xs text-gray-300">이메일 필요</span>
        )}
      </td>
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
