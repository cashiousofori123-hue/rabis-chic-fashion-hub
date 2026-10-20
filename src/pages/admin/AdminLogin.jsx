import { useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

export default function AdminLogin({ onSuccess }) {
  const { loginAdmin, loginWithAdminPasskey, unlockAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [activeOnAnotherDevice, setActiveOnAnotherDevice] = useState(false);
  const passkeySupported = Boolean(window.PublicKeyCredential && navigator.credentials);

  const showMessage = (text, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  const restoreSameDeviceSession = async () => {
    const token = localStorage.getItem('rabi_admin_access_token');
    if (!token) return false;
    const { data } = await api.get('/admin/session/check');
    if (!data.valid || !data.isOwnDevice) return false;
    unlockAdmin(token);
    onSuccess?.();
    return true;
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
        showMessage('Only admin can sign in — Access denied.', true);
      } else {
        showMessage(detail || 'Wrong email or password.', true);
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
        if (await restoreSameDeviceSession()) return;
        throw new Error('Face ID / Passkey is not available in this browser. Sign in with your email and password.');
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
      try {
        if (await restoreSameDeviceSession()) return;
      } catch { /* Keep the passkey error for this device. */ }
      showMessage(detail, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-white p-4 text-slate-900">
      {activeOnAnotherDevice && <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="active-admin-title">
        <section className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl">
          <h2 id="active-admin-title" className="text-lg font-bold">Admin already signed in</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Admin already signed in on another phone. Only that phone can see the portal.</p>
          <button type="button" onClick={() => setActiveOnAnotherDevice(false)} className="mt-5 min-h-11 w-full rounded-xl bg-black px-4 text-sm font-bold text-white">Close</button>
        </section>
      </div>}

      <section className="w-full max-w-sm space-y-6">
        <header className="space-y-2 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-slate-300 text-xl font-bold">R</div>
          <h1 className="text-2xl font-bold tracking-tight">Rabis Chic Admin</h1>
          <p className="text-xs text-slate-500">Restricted access · administrators only</p>
        </header>

        <form onSubmit={handlePasswordLogin} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <label className="block text-xs font-bold text-slate-700">Email
            <input type="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-black" />
          </label>
          <label className="block text-xs font-bold text-slate-700">Password
            <input type="password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-black" />
          </label>
          <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-black px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
          <button type="button" disabled={busy} onClick={handlePasskeyLogin} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50">
            <Fingerprint size={18} /> Login with Face ID / Passkey
          </button>
          {message && <p role={isError ? 'alert' : 'status'} className={`text-center text-xs font-semibold ${isError ? 'text-red-700' : 'text-slate-600'}`}>{message}</p>}
        </form>

        <p className="text-center text-[10px] text-slate-500">Rabi's Chic Fashion Hub · Admin Portal</p>
      </section>
    </main>
  );
}
