'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  open,
  title,
  children,
  onClose,
  size = 'md',
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!open) return null;
  const width = size === 'lg' ? 'max-w-4xl' : size === 'sm' ? 'max-w-md' : 'max-w-2xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section className={`max-h-[90vh] w-full ${width} overflow-y-auto rounded-xl border border-white/15 bg-[#1f201e] shadow-2xl`} onMouseDown={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1f201e] px-5 py-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-zinc-400 hover:bg-white/5 hover:text-white" aria-label="Fechar">
            <X size={20} />
          </button>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}
