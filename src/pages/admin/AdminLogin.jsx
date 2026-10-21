import { useState } from 'react';
import { ArrowLeft, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin({ onSuccess }) {
  const { loginAdmin } = useAuth();
  const rememberedEmail = localStorage.getItem('lastAdminEmail') || '';
  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const signIn = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await loginAdmin(email.trim(), password);
      localStorage.setItem('lastAdminEmail', user.email);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.detail || 'We could not sign you in. Check your email and password and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f7f6f3] px-4 py-10 text-slate-950">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rose-100/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-amber-100/60 blur-3xl" />
      <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_24px_80px_-32px_rgba(0,0,0,0.3)]">
        <div className="h-1.5 bg-gradient-to-r from-black via-rose-700 to-amber-500" />
        <div className="p-6 sm:p-9">
          <a href="/" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-black"><ArrowLeft size={16} /> Back to store</a>
          <div className="mt-7 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-black text-white"><LockKeyhole size={21} /></span>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-700">Rabi's Chic</p><h1 className="text-2xl font-bold tracking-tight">Welcome back</h1></div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">Sign in with your admin email and password to open your dashboard.</p>

          {rememberedEmail && <button type="button" onClick={() => { setEmail(rememberedEmail); setPassword(''); setError(''); document.getElementById('admin-password')?.focus(); }} className="mt-6 flex min-h-14 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-left transition hover:border-black">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-black text-sm font-bold text-white">{rememberedEmail[0].toUpperCase()}</span>
            <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-500">Quick sign in</span><span className="block truncate text-sm font-bold">{rememberedEmail}</span></span>
            <Sparkles size={17} className="text-rose-700" />
          </button>}

          <form onSubmit={signIn} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">Email address
              <input type="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10" />
            </label>
            <label className="block text-sm font-semibold">Password
              <input id="admin-password" type="password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your admin password" className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10" />
            </label>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800">{error}</p>}
            <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-black px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in to dashboard'}</button>
          </form>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck size={15} /> Admin access</div>
        </div>
      </section>
    </main>
  );
}
