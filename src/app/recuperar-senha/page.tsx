'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { AuthError, AuthPage, Z10Logo, authInputClass } from '@/components/auth/AuthUI';
import { supabase } from '@/lib/supabase';

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [sent, setSent] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setLoading(true); setError(''); const next = encodeURIComponent('/definir-senha?mode=reset'); const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=${next}` }); setLoading(false); if (resetError) return setError(resetError.message); setSent(true); }
  return <AuthPage wide><div className="p-8 sm:p-12"><Z10Logo centered/><h1 className="mt-8 text-center text-3xl font-black text-slate-950">Recuperar senha</h1><p className="mt-3 text-center leading-6 text-slate-500">Enviaremos um link seguro para você criar uma nova senha.</p>{sent ? <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-800">E-mail enviado. Confira também a caixa de spam.</div> : <form onSubmit={submit} className="mt-8 space-y-4"><label className="block"><span className="mb-1.5 block font-semibold text-slate-800">E-mail</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={authInputClass}/></label><AuthError message={error}/><button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-bold text-white">{loading && <Loader2 className="animate-spin" size={18}/>} Enviar link</button></form>}<Link href="/login" className="mt-6 block text-center font-semibold text-blue-600">Voltar para o login</Link></div></AuthPage>;
}
