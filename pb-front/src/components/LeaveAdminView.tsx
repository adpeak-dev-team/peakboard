'use client';

import { useMemo, useState } from 'react';
import { Check, X, Trash2, Users, CalendarCheck } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { computeAnnualLeave, leavePeriod, usedLeaveDays } from '@/lib/leave';
import { todayStr } from '@/lib/date';
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
// 서브탭(세그먼트) 활성 색 + 신청자 아바타 색 + 카운트 뱃지 색
const STATUS_ACTIVE_TEXT: Record<LeaveStatus, string> = {
  pending: 'text-amber-700',
  approved: 'text-green-700',
  rejected: 'text-gray-600',
};
const STATUS_AVATAR: Record<LeaveStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-gray-200 text-gray-500',
};
const STATUS_COUNT_BADGE: Record<LeaveStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-gray-300 text-gray-600',
};
const STATUS_EMPTY: Record<LeaveStatus, string> = {
  pending: '대기 중인 신청이 없습니다.',
  approved: '승인된 신청이 없습니다.',
  rejected: '반려된 신청이 없습니다.',
};
const REQ_TABS: LeaveStatus[] = ['pending', 'approved', 'rejected'];

export default function LeaveAdminView() {
  const employeesQuery = useEmployeesQuery();
  const employees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);
  const updateEmployee = useUpdateEmployeeMutation();
  const leaveQuery = useLeaveRequestsQuery();
  const requests = useMemo(() => leaveQuery.data ?? [], [leaveQuery.data]);
  const updateStatus = useUpdateLeaveStatusMutation();
  const deleteLeave = useDeleteLeaveMutation();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tab, setTab] = useState<'status' | 'requests'>('status');
  const [reqTab, setReqTab] = useState<LeaveStatus>('pending');

  // 직원별 "현재 연차 기간(입사일 기준)" 내 사용일수만 집계
  const today = todayStr();
  const usedByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    for (const emp of employees) {
      const period = leavePeriod(emp.hireDate, today);
      const empReqs = requests.filter((r) => r.employeeId === emp.id);
      map.set(emp.id, usedLeaveDays(empReqs, period));
    }
    return map;
  }, [employees, requests, today]);

  // 상태별 카운트 + 현재 서브탭 필터링
  const reqCounts = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    }),
    [requests]
  );
  const pendingCount = reqCounts.pending;
  const filteredRequests = useMemo(
    () => requests.filter((r) => r.status === reqTab),
    [requests, reqTab]
  );

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
        <div className="flex flex-col gap-3">
          {/* 상태별 서브탭 (세그먼트) */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
            {REQ_TABS.map((s) => {
              const active = reqTab === s;
              return (
                <button
                  key={s}
                  onClick={() => setReqTab(s)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    active ? `bg-white shadow-sm ${STATUS_ACTIVE_TEXT[s]}` : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {STATUS_LABEL[s]}
                  <span
                    className={`min-w-4.5 px-1 text-center rounded-full text-[11px] font-bold ${
                      active ? STATUS_COUNT_BADGE[s] : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {reqCounts[s]}
                  </span>
                </button>
              );
            })}
          </div>

          <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            {filteredRequests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">{STATUS_EMPTY[reqTab]}</p>
            ) : (
              filteredRequests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70 transition-colors"
                >
                  {/* 신청자 아바타 */}
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold shrink-0 ${STATUS_AVATAR[r.status]}`}
                  >
                    {(r.employeeName || '?').charAt(0)}
                  </div>
                  {/* 신청자 + 기간 + 사유 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800 truncate">
                        {r.employeeName || '-'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-bold shrink-0">
                        {r.days}일
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500 truncate">
                      {r.startDate}
                      {r.endDate !== r.startDate ? ` ~ ${r.endDate}` : ''}
                      {r.reason ? ` · ${r.reason}` : ''}
                    </div>
                  </div>
                  {/* 액션 */}
                  {r.status !== 'approved' && (
                    <button
                      onClick={() => updateStatus.mutate({ id: r.id, status: 'approved' })}
                      className="flex items-center gap-0.5 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />승인
                    </button>
                  )}
                  {r.status !== 'rejected' && (
                    <button
                      onClick={() => updateStatus.mutate({ id: r.id, status: 'rejected' })}
                      className="flex items-center gap-0.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md shrink-0"
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
        </div>
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
