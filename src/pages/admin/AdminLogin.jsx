import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

export default function AdminLogin({ onSuccess, hasActiveAdmin = false, activeAdminEmail = '', adminSessionOnThisDevice = false }) {
  const { loginAdmin, loginWithAdminPasskey } = useAuth();
  const rememberedEmail = localStorage.getItem('lastAdminEmail') || '';
  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState('');
  const [useAnotherAccount, setUseAnotherAccount] = useState(!rememberedEmail);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const googleButton = useRef(null);
  const googleCallback = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const restricted = hasActiveAdmin && !adminSessionOnThisDevice;
  const passkeySupported = Boolean(window.PublicKeyCredential && navigator.credentials);

  const showMessage = (text, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  googleCallback.current = async credential => {
    setBusy(true);
    showMessage('');
    try {
      const { data } = await api.post('/auth/google', { idToken: credential });
      loginWithAdminPasskey(data);
      localStorage.setItem('lastAdminEmail', data.user.email);
      onSuccess?.();
    } catch (error) {
      showMessage(error.response?.data?.detail || 'Google sign-in could not be completed.', true);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!googleClientId || restricted || !googleButton.current) return undefined;
    let cancelled = false;
    const renderGoogleButton = () => {
      if (cancelled || !googleButton.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: response => googleCallback.current?.(response.credential),
      });
      window.google.accounts.id.renderButton(googleButton.current, {
        theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', width: 360,
      });
    };
    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      let script = document.querySelector('script[data-google-identity]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', renderGoogleButton, { once: true });
    }
    return () => { cancelled = true; };
  }, [googleClientId, restricted]);

  const handlePasswordLogin = async event => {
    event.preventDefault();
    if (restricted) return;
    setBusy(true);
    showMessage('');
    try {
      const signedInUser = await loginAdmin(email, password);
      localStorage.setItem('lastAdminEmail', signedInUser.email);
      onSuccess?.();
    } catch (error) {
      showMessage(error.response?.data?.detail || 'Check your email and password, then try again.', true);
    } finally {
      setBusy(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (restricted) return;
    setBusy(true);
    showMessage('');
    try {
      if (!passkeySupported) throw new Error('This browser does not support a device passkey. Try a browser with biometric or secure screen-lock support.');
      const { data: ceremony } = await api.post('/auth/passkey/login/begin');
      const credential = await startAuthentication({ optionsJSON: ceremony.options });
      const { data } = await api.post('/auth/passkey/login/finish', { challenge_token: ceremony.challenge_token, credential });
      loginWithAdminPasskey(data);
      localStorage.setItem('lastAdminEmail', data.user.email);
      onSuccess?.();
    } catch (error) {
      showMessage(error.response?.data?.detail || error.message || 'Passkey verification failed.', true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-white px-4 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-2xl border border-black bg-white p-6 shadow-xl sm:p-9">
        <a href="/" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-black"><ArrowLeft size={16} /> Back to store</a>

        <div className="mt-7 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-black bg-white"><LockKeyhole size={21} /></span>
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Rabi's Chic</p><h1 className="text-2xl font-bold tracking-tight">Admin sign in</h1></div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">Sign in to manage products, orders, and store content.</p>

        {restricted && <div role="alert" className="mt-5 rounded-xl border border-red-700 bg-white p-4 text-sm text-red-800">
          <p className="font-bold">Restricted to admin only.</p>
          <p className="mt-1">{activeAdminEmail || 'An administrator'} is currently signed in. Please ask them to log out first.</p>
        </div>}

        {rememberedEmail && !useAnotherAccount ? (
          <div className="mt-6 rounded-2xl border border-black p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-black text-lg font-bold text-white">{rememberedEmail.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0"><p className="font-bold">Welcome back</p><p className="truncate text-sm text-slate-600">{rememberedEmail}</p></div>
            </div>
            <button type="button" disabled={busy || restricted} onClick={() => { setUseAnotherAccount(true); setEmail(rememberedEmail); }} className="mt-5 min-h-12 w-full rounded-xl bg-black px-4 text-sm font-bold text-white disabled:opacity-50">Quick Sign In</button>
            <button type="button" disabled={busy || restricted || !passkeySupported} onClick={handlePasskeyLogin} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-black bg-white px-4 text-sm font-bold text-black disabled:opacity-50"><Fingerprint size={18} /> Face ID / Device Passkey</button>
            <button type="button" onClick={() => { setUseAnotherAccount(true); setEmail(''); setPassword(''); showMessage(''); }} className="mt-4 min-h-10 w-full text-sm font-semibold text-slate-600 underline underline-offset-4">Use another account</button>
            <p className="mt-3 text-center text-xs leading-5 text-slate-500">Quick Sign In opens the saved account form. Face ID uses your device passkey.</p>
          </div>
        ) : (
          <>
            <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
              <label className="block text-sm font-semibold">Admin email
                <input type="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" disabled={restricted} className="mt-1.5 min-h-12 w-full rounded-xl border border-black bg-white px-3.5 text-sm outline-none focus:ring-2 focus:ring-black/15 disabled:bg-slate-100" />
              </label>
              <label className="block text-sm font-semibold">Password
                <input type="password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your admin password" disabled={restricted} className="mt-1.5 min-h-12 w-full rounded-xl border border-black bg-white px-3.5 text-sm outline-none focus:ring-2 focus:ring-black/15 disabled:bg-slate-100" />
              </label>
              <button type="submit" disabled={busy || restricted} className="min-h-12 w-full rounded-xl bg-black px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Signing in…' : 'Sign In'}</button>
            </form>

            {rememberedEmail && <button type="button" onClick={() => { setUseAnotherAccount(false); setEmail(rememberedEmail); setPassword(''); showMessage(''); }} className="mt-3 min-h-9 w-full text-center text-xs font-semibold text-slate-600 underline underline-offset-4">Back to {rememberedEmail}</button>}

            <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>Or</span><span className="h-px flex-1 bg-slate-200" /></div>
            {passkeySupported && <button type="button" disabled={busy || restricted} onClick={handlePasskeyLogin} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-black bg-white px-4 text-sm font-bold text-black disabled:opacity-50"><Fingerprint size={18} /> Face ID / Device Passkey</button>}
            {googleClientId && !restricted ? <div ref={googleButton} className="mt-3 flex min-h-11 justify-center" /> : <button type="button" disabled className="mt-3 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-400" title="Set VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID to enable Google sign-in">{restricted ? 'Google Sign In unavailable during another admin session' : 'Google Sign In · setup required'}</button>}
            {!googleClientId && <p className="mt-1 text-center text-[11px] text-slate-500">Google sign-in becomes available after its OAuth client ID is added to the app and server.</p>}
          </>
        )}

        {message && <p role={isError ? 'alert' : 'status'} className={`mt-4 rounded-xl border p-3 text-center text-sm font-semibold ${isError ? 'border-red-700 text-red-800' : 'border-black text-slate-800'}`}>{message}</p>}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck size={15} /> Private access for the store administrator</div>
      </section>
    </main>
  );
}
