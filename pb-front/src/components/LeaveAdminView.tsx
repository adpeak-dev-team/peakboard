'use client';

import { useMemo, useState } from 'react';
import { Check, X, Trash2, Users, CalendarCheck } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { computeAnnualLeave } from '@/lib/leave';
import { useEmployeesQuery } from '@/services/work/employees/queries';
import { useUpdateEmployeeMutation } from '@/services/work/employees/mutations';
import { useLeaveRequestsQuery } from '@/services/work/leave/queries';
import {
  useUpdateLeaveStatusMutation,
  useDeleteLeaveMutation,
} from '@/services/work/leave/mutations';
import type { LeaveStatus } from '@/services/work/type';

const STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: '대기',
  approved: '승인',
  rejected: '반려',
};
const STATUS_CHIP: Record<LeaveStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-gray-200 text-gray-500 border-gray-300',
};

export default function LeaveAdminView() {
  const employeesQuery = useEmployeesQuery();
  const employees = employeesQuery.data ?? [];
  const updateEmployee = useUpdateEmployeeMutation();
  const leaveQuery = useLeaveRequestsQuery();
  const requests = useMemo(() => leaveQuery.data ?? [], [leaveQuery.data]);
  const updateStatus = useUpdateLeaveStatusMutation();
  const deleteLeave = useDeleteLeaveMutation();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tab, setTab] = useState<'status' | 'requests'>('status');

  const usedByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of requests) {
      if (r.status !== 'approved') continue;
      map.set(r.employeeId, (map.get(r.employeeId) ?? 0) + r.days);
    }
    return map;
  }, [requests]);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      {/* 탭 */}
      <div className="flex border-b border-gray-200">
        <TabButton active={tab === 'status'} onClick={() => setTab('status')}>
          <Users className="w-4 h-4" />직원별 현황
        </TabButton>
        <TabButton active={tab === 'requests'} onClick={() => setTab('requests')}>
          <CalendarCheck className="w-4 h-4" />연차 신청 목록
          {pendingCount > 0 && (
            <span className="ml-1 px-1.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
              {pendingCount}
            </span>
          )}
        </TabButton>
      </div>

      {tab === 'status' ? (
        <section className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500">
                <th className="px-3 py-2">이름</th>
                <th className="px-3 py-2">부서</th>
                <th className="px-3 py-2 w-40">입사일</th>
                <th className="px-3 py-2 w-40">부여</th>
                <th className="px-3 py-2 w-40">사용</th>
                <th className="px-3 py-2 w-40">잔여</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const used = usedByEmployee.get(emp.id) ?? 0;
                const remaining = emp.leaveTotal - used;
                return (
                  <tr key={emp.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-sm text-gray-800">{emp.name || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-500">{emp.department || '-'}</td>
                    <td className="px-3 py-1.5">
                      <input
                        type="date"
                        defaultValue={emp.hireDate ?? ''}
                        onChange={(e) => {
                          const hireDate = e.target.value || null;
                          // 입사일 입력 시 연차 부여 자동 계산 (부여는 이후 수정 가능)
                          updateEmployee.mutate({
                            id: emp.id,
                            patch: {
                              hireDate,
                              leaveTotal: hireDate ? computeAnnualLeave(hireDate) : emp.leaveTotal,
                            },
                          });
                        }}
                        className="px-2 py-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        key={`${emp.id}-${emp.leaveTotal}`}
                        type="number"
                        min={0}
                        defaultValue={emp.leaveTotal}
                        onBlur={(e) => {
                          const n = Number(e.target.value);
                          if (Number.isFinite(n) && n !== emp.leaveTotal) {
                            updateEmployee.mutate({
                              id: emp.id,
                              patch: { leaveTotal: Math.max(0, Math.floor(n)) },
                            });
                          }
                        }}
                        className="w-20 px-2 py-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <span className="text-xs text-gray-400 ml-1">일</span>
                    </td>
                    <td className="px-3 py-2 text-sm text-indigo-600 font-medium">{used}일</td>
                    <td className="px-3 py-2 text-sm text-green-600 font-medium">{remaining}일</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {employees.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">직원이 없습니다.</p>
          )}
        </section>
      ) : (
        <section className="rounded-lg border border-gray-200 bg-white">
          {requests.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">신청 내역이 없습니다.</p>
          ) : (
            requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 last:border-b-0"
              >
                <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-semibold shrink-0 ${STATUS_CHIP[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
                <span className="text-sm font-medium text-gray-800 shrink-0 w-20 truncate">
                  {r.employeeName || '-'}
                </span>
                <span className="flex-1 min-w-0 text-sm text-gray-600 truncate">
                  {r.startDate}
                  {r.endDate !== r.startDate ? ` ~ ${r.endDate}` : ''} · {r.days}일
                  {r.reason ? ` · ${r.reason}` : ''}
                </span>
                {r.status !== 'approved' && (
                  <button
                    onClick={() => updateStatus.mutate({ id: r.id, status: 'approved' })}
                    className="flex items-center gap-0.5 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />승인
                  </button>
                )}
                {r.status !== 'rejected' && (
                  <button
                    onClick={() => updateStatus.mutate({ id: r.id, status: 'rejected' })}
                    className="flex items-center gap-0.5 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />반려
                  </button>
                )}
                <button
                  onClick={() => setDeletingId(r.id)}
                  className="text-gray-300 hover:text-red-500 shrink-0"
                  aria-label="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </section>
      )}

      <ConfirmModal
        open={!!deletingId}
        title="신청 삭제"
        message="삭제된 데이터는 복구할 수 없습니다."
        onConfirm={() => deletingId && deleteLeave.mutate(deletingId)}
        onClose={() => setDeletingId(null)}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
