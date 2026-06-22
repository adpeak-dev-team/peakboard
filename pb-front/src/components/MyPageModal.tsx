'use client';

import { useRef, useState } from 'react';
import { Camera, Check, KeyRound, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import Modal from './Modal';
import { updateProfile, changePassword, type AuthUser } from '@/services/auth/api';
import { authMeQueryKey } from '@/services/auth/AuthProvider';

// 이미지 파일을 정사각 최대 256px JPEG data URL 로 리사이즈
function fileToResizedDataUrl(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas 미지원'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const msg = (err: unknown, fallback: string) =>
  (err as AxiosError<{ resultMessage?: string }>).response?.data?.resultMessage ?? fallback;

export default function MyPageModal({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const qc = useQueryClient();
  const emp = user.employee;

  const [name, setName] = useState(user.name);
  const [department, setDepartment] = useState(emp?.department ?? '');
  const [position, setPosition] = useState(emp?.position ?? '');
  const [phone, setPhone] = useState(emp?.phone ?? '');
  const [avatar, setAvatar] = useState<string | null>(emp?.avatar ?? null);
  const [savingProfile, setSavingProfile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwOk, setPwOk] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const inputCls =
    'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400';
  const initial = (name || user.email || '?').charAt(0);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있어요.');
      return;
    }
    try {
      setAvatar(await fileToResizedDataUrl(f));
    } catch {
      alert('이미지 처리에 실패했어요.');
    }
  };

  const saveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      const updated = await updateProfile({ name, department, position, phone, avatar });
      qc.setQueryData(authMeQueryKey, updated);
      onClose();
    } catch (err) {
      alert(msg(err, '프로필 저장에 실패했어요.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (savingPw) return;
    setPwMsg('');
    setPwOk(false);
    if (newPw.length < 4) {
      setPwMsg('새 비밀번호는 4자 이상이어야 합니다.');
      return;
    }
    setSavingPw(true);
    try {
      await changePassword(curPw, newPw);
      setPwOk(true);
      setPwMsg('비밀번호가 변경되었습니다.');
      setCurPw('');
      setNewPw('');
    } catch (err) {
      setPwMsg(msg(err, '비밀번호 변경에 실패했어요.'));
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <Modal open title="마이페이지" onClose={onClose} width="max-w-md">
      {/* 프로필 */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-linear-to-br from-indigo-400 to-blue-500 text-white flex items-center justify-center text-2xl font-bold ring-4 ring-gray-50">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="프로필" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow"
            aria-label="이미지 변경"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
        </div>
        {avatar && (
          <button
            onClick={() => setAvatar(null)}
            className="mt-2 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500"
          >
            <Trash2 className="w-3 h-3" />이미지 제거
          </button>
        )}
        <p className="mt-2 text-xs text-gray-400">{user.email}</p>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">이름</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">부서</label>
            <input className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">직급</label>
            <input className={inputCls} value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">연락처</label>
          <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button
          onClick={saveProfile}
          disabled={savingProfile}
          className="w-full flex items-center justify-center gap-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          {savingProfile ? '저장 중…' : '프로필 저장'}
        </button>
      </div>

      {/* 비밀번호 변경 */}
      <div className="mt-6 pt-5 border-t border-gray-100">
        <h4 className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-3">
          <KeyRound className="w-4 h-4 text-gray-400" />
          비밀번호 변경
        </h4>
        <div className="space-y-3">
          <input
            type="password"
            autoComplete="current-password"
            className={inputCls}
            placeholder="현재 비밀번호"
            value={curPw}
            onChange={(e) => setCurPw(e.target.value)}
          />
          <input
            type="password"
            autoComplete="new-password"
            className={inputCls}
            placeholder="새 비밀번호 (4자 이상)"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && savePassword()}
          />
          {pwMsg && (
            <p className={`text-xs ${pwOk ? 'text-green-600' : 'text-red-500'}`}>{pwMsg}</p>
          )}
          <button
            onClick={savePassword}
            disabled={savingPw}
            className="w-full py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
          >
            {savingPw ? '변경 중…' : '비밀번호 변경'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
