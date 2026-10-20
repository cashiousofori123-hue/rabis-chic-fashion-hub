import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

export default function AdminLogin({ onSuccess }) {
  const { loginAdmin, loginWithAdminPasskey } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [activeOnAnotherDevice, setActiveOnAnotherDevice] = useState(false);
  const passkeySupported = Boolean(window.PublicKeyCredential && navigator.credentials);

  const showMessage = (text, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  const handlePasswordLogin = async event => {
    event.preventDefault();
    setBusy(true);
    showMessage('');
    try {
      await loginAdmin(email, password);
      onSuccess?.();
    } catch (error) {
      const detail = error.response?.data?.detail || '';
      if (error.response?.headers?.['x-admin-session-active'] === 'true' || /already signed in on another phone/i.test(detail)) {
        setActiveOnAnotherDevice(true);
      }
      if (error.response?.status === 403 && /configured admin/i.test(detail)) {
        showMessage('Only admin can sign in — access denied.', true);
      } else {
        showMessage(detail || 'Check your email and password, then try again.', true);
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setBusy(true);
    showMessage('');
    try {
      if (!passkeySupported) {
        throw new Error('This browser cannot use a device passkey. Try a browser with biometric or secure screen-lock support.');
      }
      const { data: ceremony } = await api.post('/auth/passkey/login/begin');
      const credential = await startAuthentication({ optionsJSON: ceremony.options });
      const { data } = await api.post('/auth/passkey/login/finish', { challenge_token: ceremony.challenge_token, credential });
      loginWithAdminPasskey(data);
      onSuccess?.();
    } catch (error) {
      const detail = error.response?.data?.detail || error.message || 'Passkey verification failed.';
      if (error.response?.headers?.['x-admin-session-active'] === 'true' || /already signed in on another phone/i.test(detail)) {
        setActiveOnAnotherDevice(true);
      }
      showMessage(detail, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fbf7f6] px-4 py-8 text-slate-900 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-28 top-[-8rem] h-80 w-80 rounded-full bg-rose-200/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 right-[-6rem] h-96 w-96 rounded-full bg-pink-100/70 blur-3xl" />

      {activeOnAnotherDevice && <div className="fixed inset-0 z-[1000] grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="active-admin-title">
        <section className="w-full max-w-sm rounded-3xl border border-rose-100 bg-white p-7 text-center shadow-2xl">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700"><ShieldCheck size={24} /></div>
          <h2 id="active-admin-title" className="mt-4 text-lg font-bold">Admin already signed in</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Admin is active on another phone. Only that signed-in device can access the portal.</p>
          <button type="button" onClick={() => setActiveOnAnotherDevice(false)} className="mt-5 min-h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800">Close</button>
        </section>
      </div>}

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-rose-100 bg-white shadow-[0_28px_90px_-42px_rgba(136,19,55,0.38)] lg:min-h-[620px] lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative flex min-h-56 flex-col justify-between overflow-hidden bg-gradient-to-br from-rose-700 via-rose-600 to-pink-500 p-7 text-white sm:p-10 lg:min-h-full">
          <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/15" />
          <div aria-hidden="true" className="absolute -right-12 -top-12 h-48 w-48 rounded-full border border-white/15" />
          <div className="relative">
            <a href="/" className="inline-flex items-center gap-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/80">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/35 bg-white/15 font-serif text-2xl font-bold shadow-sm">R</span>
              <span><span className="block font-serif text-xl font-bold leading-tight">Rabi’s Chic</span><span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-100">Fashion &amp; Campus Essentials</span></span>
            </a>
          </div>
          <div className="relative mt-8 max-w-md lg:mb-8 lg:mt-20">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-100">Store administration</p>
            <h1 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">Welcome back to your store.</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/85">Sign in to manage orders, products, and the Rabi’s Chic storefront.</p>
            <div className="mt-7 flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15"><ShieldCheck size={20} /></span>
              <span><span className="block text-xs font-bold">Private admin access</span><span className="mt-1 block text-[11px] leading-4 text-white/75">Only the enrolled device can open the portal.</span></span>
            </div>
          </div>
          <p className="relative mt-8 text-[10px] font-medium text-white/70">Secure access for the store administrator</p>
        </aside>

        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-md">
            <a href="/" className="inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-rose-700"><ArrowLeft size={15} /> Back to store</a>
            <div className="mt-7">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-rose-700"><LockKeyhole size={20} /></div>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-rose-600">Administrator sign in</p>
              <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight text-slate-950">Secure access</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Use your store credentials or the passkey enrolled on this device.</p>
            </div>

            <form onSubmit={handlePasswordLogin} className="mt-7 space-y-4">
              <label className="block text-xs font-bold text-slate-700">Admin email
                <input type="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100" />
              </label>
              <label className="block text-xs font-bold text-slate-700">Password
                <span className="relative mt-1.5 block">
                  <input type={passwordVisible ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your admin password" className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100" />
                  <button type="button" onClick={() => setPasswordVisible(value => !value)} aria-label={passwordVisible ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400 hover:text-slate-700">{passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </span>
              </label>
              <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60">{busy ? 'Signing in…' : 'Sign In to Admin Portal'}</button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>Or continue with</span><span className="h-px flex-1 bg-slate-200" /></div>
            <button type="button" disabled={busy} onClick={handlePasskeyLogin} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-800 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-50">
              <Fingerprint size={18} /> Use this device’s passkey
            </button>
            <p className="mt-3 text-center text-[11px] leading-5 text-slate-500">Your fingerprint or Face ID stays on your device. The device may ask for its secure screen lock instead.</p>
            {message && <p role={isError ? 'alert' : 'status'} className={`mt-4 rounded-xl px-3 py-2.5 text-center text-xs font-semibold ${isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{message}</p>}
            <p className="mt-7 text-center text-[10px] font-medium text-slate-400">Protected store access · Rabi’s Chic</p>
          </div>
        </section>
      </div>
    </main>
  );
}
