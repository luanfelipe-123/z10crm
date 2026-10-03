'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthError, AuthPage, Divider, SocialButtons, Z10Logo, authInputClass } from '@/components/auth/AuthUI';
import { authDestination } from '@/lib/auth-destination';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) { setError(signInError.message === 'Invalid login credentials' ? 'E-mail ou senha inválidos.' : signInError.message); setLoading(false); return; }
    router.replace(await authDestination()); router.refresh();
  }

  return <AuthPage wide><div><Z10Logo centered /><h1>Bem-vindo de volta</h1><p className="auth-panel__copy">Acesse sua conta e continue gerenciando suas vendas, WhatsApp e automações.</p><div className="mt-7"><form onSubmit={submit} className="space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-semibold text-foreground">E-mail</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" className={authInputClass} /></label><label className="block"><span className="mb-1.5 block text-sm font-semibold text-foreground">Senha</span><div className="relative"><input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" className={`${authInputClass} pr-12`} /><button aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label><div className="text-right"><Link href="/recuperar-senha" className="text-xs font-semibold text-primary hover:underline">Esqueceu a senha?</Link></div><AuthError message={error}/><button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-primary-strong disabled:opacity-60">{loading && <Loader2 className="animate-spin" size={18}/>} Entrar</button></form><Divider/><SocialButtons onError={setError} loadingProvider={loadingProvider} setLoadingProvider={setLoadingProvider}/><p className="mt-6 text-center text-sm text-muted">Ainda não tem conta? <Link href="/cadastro" className="font-bold text-primary hover:underline">Criar conta</Link></p></div></div></AuthPage>;
}
