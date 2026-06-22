'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { AxiosError } from 'axios';
import { signup } from '@/services/auth/api';

export default function SignupPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    position: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    if (form.password.length < 4) {
      setError('비밀번호는 4자 이상이어야 합니다.');
      return;
    }
    setSubmitting(true);
    try {
      await signup(form);
      window.location.href = '/';
    } catch (err) {
      const msg =
        (err as AxiosError<{ resultMessage?: string }>).response?.data?.resultMessage ??
        '회원가입에 실패했습니다.';
      setError(msg);
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <CheckCircle2 className="w-7 h-7 text-indigo-500" />
          <span className="text-xl font-bold tracking-wide text-gray-800">PeakBoard</span>
        </div>
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 flex flex-col gap-4"
        >
          <h1 className="text-lg font-bold text-gray-800">회원가입</h1>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">이름</label>
            <input autoFocus className={inputCls} value={form.name} onChange={set('name')} placeholder="홍길동" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">이메일</label>
            <input
              type="email"
              autoComplete="email"
              className={inputCls}
              value={form.email}
              onChange={set('email')}
              placeholder="you@peakboard.io"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">비밀번호</label>
            <input
              type="password"
              autoComplete="new-password"
              className={inputCls}
              value={form.password}
              onChange={set('password')}
              placeholder="4자 이상"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">부서</label>
              <input className={inputCls} value={form.department} onChange={set('department')} placeholder="개발팀" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">직급</label>
              <input className={inputCls} value={form.position} onChange={set('position')} placeholder="사원" />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? '가입 중…' : '회원가입'}
          </button>

          <p className="text-center text-xs text-gray-500">
            이미 계정이 있으신가요?{' '}
            <Link href="/auth/login" className="font-semibold text-indigo-600 hover:underline">
              로그인
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
