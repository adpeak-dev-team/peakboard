// 임시 게스트 식별. 정식 인증 도입 전까지 sessionStorage 에 이름을 보관한다.
// Phase 3(실시간 협업)에서 presence(커서/접속자) 표시에도 같은 이름을 사용한다.

const NAME_KEY = 'peakboard:guestName';

export function getGuestName(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(NAME_KEY) ?? '';
}

export function setGuestName(name: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = name.trim().slice(0, 100);
  if (trimmed) sessionStorage.setItem(NAME_KEY, trimmed);
}

// 이름이 없으면 입력 받아 저장하고 반환. 취소 시 빈 문자열.
export function ensureGuestName(): string {
  const existing = getGuestName();
  if (existing) return existing;
  if (typeof window === 'undefined') return '';
  const input = window.prompt('문서에 표시할 이름을 입력하세요.')?.trim() ?? '';
  if (input) setGuestName(input);
  return input;
}
