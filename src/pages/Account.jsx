import { useState } from 'react';
import { ArrowLeft, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AccountPage({ mode = 'login', onBack, onNavigate }) {
  const { login, signup } = useAuth();
  const [kind, setKind] = useState(mode === 'signup' ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async event => {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      if (kind === 'signup') {
        await signup(email, password, name);
        setMessage('Your account request was submitted. An administrator will approve it before you can sign in.');
        setKind('login');
      } else {
        const account = await login(email, password);
        onNavigate(account.role === 'admin' ? '/admin' : '/');
      }
    } catch (error) {
      setMessage(error.response?.data?.detail || (kind === 'signup' ? 'Could not create your account.' : 'Email or password was not accepted.'));
    } finally { setBusy(false); }
  };
  return <main className="grid min-h-screen place-items-center bg-[#f6f6f4] px-4 py-8 text-slate-900">
    <section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <button type="button" onClick={onBack} className="mb-5 flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={18} /> Back to store</button>
      <div className="mb-5"><p className="text-xs font-black uppercase tracking-[.2em] text-rose-600">Rabi’s Chic</p><h1 className="mt-2 text-2xl font-black">{kind === 'login' ? 'Welcome back' : 'Create an account'}</h1><p className="mt-1 text-sm text-slate-500">{kind === 'login' ? 'Sign in to your store account.' : 'Account approval may be required before signing in.'}</p></div>
      <form onSubmit={submit} className="space-y-3">
        {kind === 'signup' && <label className="block text-xs font-bold text-slate-600">Full name<div className="relative mt-1"><UserRound size={17} className="absolute left-3 top-3.5 text-slate-400" /><input required autoComplete="name" value={name} onChange={event => setName(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm" placeholder="Your name" /></div></label>}
        <label className="block text-xs font-bold text-slate-600">Email<div className="relative mt-1"><Mail size={17} className="absolute left-3 top-3.5 text-slate-400" /><input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm" placeholder="you@example.com" /></div></label>
        <label className="block text-xs font-bold text-slate-600">Password<div className="relative mt-1"><LockKeyhole size={17} className="absolute left-3 top-3.5 text-slate-400" /><input required minLength={kind === 'signup' ? 12 : 1} type="password" autoComplete={kind === 'login' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm" placeholder={kind === 'signup' ? 'At least 12 characters' : 'Password'} /></div></label>
        {message && <p role="status" className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}
        <button disabled={busy} className="min-h-12 w-full rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Please wait…' : kind === 'login' ? 'Sign In' : 'Create Account'}</button>
      </form>
      <button type="button" onClick={() => { setKind(kind === 'login' ? 'signup' : 'login'); setMessage(''); }} className="mt-4 min-h-11 w-full text-sm font-semibold text-slate-600">{kind === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button>
    </section>
  </main>;
}
