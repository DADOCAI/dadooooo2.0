// 新增：注册防机器人逻辑 — 前端限流（每日≤3次成功注册）

const KEY = 'register_limit_info';

export interface RegisterLimitInfo {
  date: string;
  successCount: number;
}

export function getToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getRegisterLimitInfo(): RegisterLimitInfo {
  try {
    const raw = localStorage.getItem(KEY);
    const today = getToday();
    if (!raw) return { date: today, successCount: 0 };
    const data = JSON.parse(raw) as RegisterLimitInfo;
    if (!data?.date || data.date !== today) return { date: today, successCount: 0 };
    const cnt = typeof data.successCount === 'number' ? data.successCount : 0;
    return { date: today, successCount: Math.max(0, cnt) };
  } catch {
    return { date: getToday(), successCount: 0 };
  }
}

export function canRegisterToday(maxPerDay = 3): boolean {
  const info = getRegisterLimitInfo();
  return info.successCount < maxPerDay;
}

export function incrementRegisterSuccess(maxPerDay = 3): void {
  try {
    const today = getToday();
    const info = getRegisterLimitInfo();
    const next: RegisterLimitInfo = {
      date: today,
      successCount: Math.min(maxPerDay, (info.successCount || 0) + 1)
    };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

