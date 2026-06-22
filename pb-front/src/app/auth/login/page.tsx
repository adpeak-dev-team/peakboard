'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { AxiosError } from 'axios';
import { login } from '@/services/auth/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      // 전체 새로고침으로 인증 상태를 새로 불러온다.
      window.location.href = '/';
    } catch (err) {
      const msg =
        (err as AxiosError<{ resultMessage?: string }>).response?.data?.resultMessage ??
        '로그인에 실패했습니다.';
      setError(msg);
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <CheckCircle2 className="w-7 h-7 text-indigo-500" />
          <span className="text-xl font-bold tracking-wide text-gray-800">PeakBoard</span>
        </div>
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 flex flex-col gap-4"
        >
          <h1 className="text-lg font-bold text-gray-800">로그인</h1>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">이메일</label>
            <input
              type="email"
              autoFocus
              autoComplete="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@peakboard.io"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">비밀번호</label>
            <input
              type="password"
              autoComplete="current-password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? '로그인 중…' : '로그인'}
          </button>

          <p className="text-center text-xs text-gray-500">
            계정이 없으신가요?{' '}
            <Link href="/auth/signup" className="font-semibold text-indigo-600 hover:underline">
              회원가입
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
