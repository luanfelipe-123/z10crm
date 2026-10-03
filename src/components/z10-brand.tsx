import type { SVGProps } from 'react';

export function Z10Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 40" aria-hidden="true" className={className}>
      <path d="M9 4h25c2.8 0 4.1 3.2 2.2 5.2L30 16H7.5C4.7 16 3.3 12.7 5.2 10.7L9 4Z" fill="currentColor" />
      <path d="M18 16h22.5c2.8 0 4.2 3.3 2.2 5.3L29 36H4.5c-2.8 0-4.1-3.3-2.2-5.3L18 16Z" fill="currentColor" opacity=".78" />
      <path d="M22 16h8L18 29H10l12-13Z" fill="currentColor" opacity=".45" />
    </svg>
  );
}

export default function Z10Brand({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <div className={`z10-brand ${compact ? 'z10-brand--compact' : ''} ${inverse ? 'z10-brand--inverse' : ''}`}>
      <Z10Mark className="z10-brand__mark" />
      {!compact && <div><div className="z10-brand__name">Z10</div><div className="z10-brand__label">CRM</div></div>}
    </div>
  );
}
