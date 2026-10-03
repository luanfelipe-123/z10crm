'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/inicio');
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-8 shadow-2xl">
        <div className="mb-8">
          <div className="text-3xl font-bold tracking-tight">Z10 CRM</div>
          <p className="mt-2 text-sm text-zinc-400">Entre para acessar seu ambiente.</p>
        </div>
        <label className="mb-2 block text-sm text-zinc-300">E-mail</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mb-4 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 outline-none focus:border-sky-500" />
        <label className="mb-2 block text-sm text-zinc-300">Senha</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mb-4 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 outline-none focus:border-sky-500" />
        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
        <button disabled={loading} className="w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-zinc-950 hover:bg-sky-400 disabled:opacity-50">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
