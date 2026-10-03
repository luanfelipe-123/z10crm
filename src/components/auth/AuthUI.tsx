'use client';

import type { ReactNode } from 'react';
import { BarChart3, Bot, Loader2, MessageCircle, Sparkles, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Z10Brand from '@/components/z10-brand';

export const authInputClass = 'auth-input';
export function Z10Logo({ centered = false }: { centered?: boolean }) { return <div className={centered ? 'flex justify-center' : ''}><Z10Brand/></div>; }

const benefits = [[Users, 'Gestão de leads', 'Do primeiro contato ao fechamento'], [MessageCircle, 'WhatsApp integrado', 'Atendimento e automações'], [BarChart3, 'Relatórios em tempo real', 'Decisões com dados claros'], [Bot, 'Automações inteligentes', 'Mais produtividade para sua equipe']] as const;

export function AuthPage({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <main className="auth-shell"><section className={`auth-frame ${wide ? 'auth-frame--wide' : ''}`}>
    <aside className="auth-story"><div><Z10Brand inverse/><div className="auth-story__kicker"><Sparkles size={14}/> Tudo o que você precisa, em um só lugar.</div><h1>Mais vendas.<br/><span>Mais controle.</span><br/>Menos trabalho.</h1><p className="auth-story__copy">Gerencie leads, vendas, WhatsApp e automações de forma simples, rápida e eficiente.</p></div><div className="auth-features">{benefits.map(([Icon,title,copy]) => <div className="auth-feature" key={title}><span className="auth-feature__icon"><Icon size={16}/></span><span><strong className="block text-slate-100">{title}</strong><small>{copy}</small></span></div>)}</div></aside>
    <div className="auth-panel"><div className="auth-panel__inner">{children}</div></div>
  </section></main>;
}

function GoogleMark() { return <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>; }
export function SocialButtons({ label = 'Continuar', onError, loadingProvider, setLoadingProvider }: { label?: string; onError: (message: string) => void; loadingProvider: string; setLoadingProvider: (provider: string) => void }) { async function oauth() { setLoadingProvider('google'); onError(''); const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } }); if (error) { onError(error.message); setLoadingProvider(''); } } return <button type="button" disabled={Boolean(loadingProvider)} onClick={oauth} className="flex w-full items-center justify-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-sm font-bold text-foreground shadow-sm transition hover:bg-surface-soft disabled:opacity-60">{loadingProvider === 'google' ? <Loader2 className="animate-spin" size={19}/> : <GoogleMark/>}{label} com Google</button>; }
export function Divider() { return <div className="flex items-center gap-4 py-4"><div className="h-px flex-1 bg-border"/><span className="text-xs text-muted">ou continue com</span><div className="h-px flex-1 bg-border"/></div>; }
export function AuthError({ message }: { message: string }) { return message ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div> : null; }
