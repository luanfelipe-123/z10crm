import type { ReactNode } from 'react';

export const settingsInputClass = 'w-full rounded-md border border-white/20 bg-[#1d1e1c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-400';

export function SettingsPageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function SettingsPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-white/15 bg-[#1f201e] ${className}`}>{children}</section>;
}

export function InitialAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'Z';
  const sizing = size === 'lg' ? 'h-28 w-28 text-5xl' : size === 'sm' ? 'h-9 w-9 text-sm' : 'h-14 w-14 text-xl';
  return <div className={`flex shrink-0 items-center justify-center rounded-full bg-rose-300/20 font-medium text-rose-300 ${sizing}`}>{initial}</div>;
}

export function UsageBar({ value, max }: { value: number; max: number }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-600/60">
      <div className="h-full rounded-full bg-sky-300" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function SaveNotice({ message, error }: { message?: string; error?: string }) {
  if (!message && !error) return null;
  return (
    <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-500/25 bg-red-500/10 text-red-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>
      {error || message}
    </div>
  );
}
