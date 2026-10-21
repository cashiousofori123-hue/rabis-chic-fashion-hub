import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

export default function AdminLogin({ onSuccess }) {
  const { loginAdmin, loginWithAdminPasskey } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const googleButton = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (!googleClientId || !googleButton.current) return undefined;
    let cancelled = false;
    const renderButton = () => {
      if (cancelled || !googleButton.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({ client_id: googleClientId, callback: async response => {
        setBusy(true);
        setError('');
        try {
          const { data } = await api.post('/auth/google', { idToken: response.credential });
          loginWithAdminPasskey(data);
          onSuccess?.();
        } catch (err) {
          setError(err.response?.data?.detail || 'Google sign-in could not be completed.');
        } finally { setBusy(false); }
      } });
      window.google.accounts.id.renderButton(googleButton.current, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', width: 360 });
    };
    if (window.google?.accounts?.id) renderButton();
    else {
      let script = document.querySelector('script[data-google-identity]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', renderButton, { once: true });
    }
    return () => { cancelled = true; };
  }, [googleClientId]);

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

  const signInWithPasskey = async () => {
    setBusy(true);
    setError('');
    try {
      const { data: ceremony } = await api.post('/auth/passkey/login/begin');
      const credential = await startAuthentication({ optionsJSON: ceremony.options });
      const { data } = await api.post('/auth/passkey/login/finish', { challenge_token: ceremony.challenge_token, credential });
      loginWithAdminPasskey(data);
      localStorage.setItem('lastAdminEmail', data.user.email);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Face ID sign-in could not be completed. Try your email and password.');
    } finally { setBusy(false); }
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
          <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>Or sign in with</span><span className="h-px flex-1 bg-slate-200" /></div>
          {googleClientId ? <div ref={googleButton} className="flex min-h-11 justify-center" /> : <button type="button" disabled title="Add VITE_GOOGLE_CLIENT_ID to enable Google sign-in" className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-400">Google Sign In · setup required</button>}
          {window.PublicKeyCredential && navigator.credentials && <button type="button" disabled={busy} onClick={signInWithPasskey} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-black bg-white px-4 text-sm font-bold text-black disabled:opacity-50"><Fingerprint size={18} /> Face ID / Passkey</button>}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck size={15} /> Admin access</div>
        </div>
      </section>
    </main>
  );
}
