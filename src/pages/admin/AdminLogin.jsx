import { useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

/**
 * Professional Admin Sign-In card.
 * Route: hidden – accessed via hash #admin-secret-login-rabis2024
 * Tabs: [Password Login] | [Passkey Login (Face ID / Fingerprint)]
 */
export default function AdminLogin({ onSuccess }) {
  const { login, logout, user, role, adminUnlocked, loginWithAdminPasskey } = useAuth();

  const [tab,         setTab]        = useState('password'); // 'password' | 'passkey'
  const [email,       setEmail]      = useState('');
  const [password,    setPassword]   = useState('');
  const [busy,        setBusy]       = useState(false);
  const [msg,         setMsg]        = useState('');
  const [isError,     setIsError]    = useState(false);

  // Passkey support detection
  const passkeySupported =
    typeof window !== 'undefined' &&
    Boolean(window.PublicKeyCredential) &&
    Boolean(navigator.credentials);

  const showMsg = (text, error = false) => { setMsg(text); setIsError(error); };

  // ── Password login ──────────────────────────────────────────────────────────
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setBusy(true); showMsg('');
    try {
      const account = await login(email, password);
      if (account.role !== 'admin') {
        logout();
        showMsg('Access denied. This portal is for administrators only.', true);
        return;
      }
      showMsg('Admin signed in. Unlocking dashboard…');
      onSuccess?.();
    } catch (err) {
      showMsg(err.response?.data?.detail || 'Wrong email or password.', true);
    } finally { setBusy(false); }
  };

  // ── Passkey login (authentication) ─────────────────────────────────────────
  const handlePasskeyLogin = async () => {
    if (!passkeySupported) return;
    setBusy(true); showMsg('');
    try {
      const { data: ceremony } = await api.post(
        '/auth/passkey/login/begin'
      );
      const credential = await startAuthentication({ optionsJSON: ceremony.options });
      const { data } = await api.post(
        '/auth/passkey/login/finish',
        { challenge_token: ceremony.challenge_token, credential }
      );
      loginWithAdminPasskey(data);
      showMsg('Dashboard unlocked with passkey!');
      onSuccess?.();
    } catch (err) {
      showMsg(err.response?.data?.detail || err.message || 'Passkey verification failed.', true);
    } finally { setBusy(false); }
  };

  // ── Register passkey (after password login) ─────────────────────────────────
  const handleRegisterPasskey = async () => {
    setBusy(true); showMsg('');
    try {
      const { data: ceremony } = await api.post('/auth/admin/passkeys/registration/options');
      const credential = await startRegistration({ optionsJSON: ceremony.options });
      await api.post('/auth/admin/passkeys/registration/verify', {
        challenge_token: ceremony.challenge_token,
        credential,
        label: 'This device',
      });
      showMsg('Face ID / Fingerprint enabled for this device!');
    } catch (err) {
      showMsg(err.response?.data?.detail || err.message || 'Passkey setup failed.', true);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white flex items-center justify-center font-serif font-bold text-3xl shadow-xl mx-auto">
            R
          </div>
          <h1 className="text-white font-serif font-bold text-2xl">Rabis Chic Admin</h1>
          <p className="text-slate-400 text-xs">Restricted access — administrators only</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl">

          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden border border-slate-700">
            <button
              type="button"
              onClick={() => setTab('password')}
              className={`flex-1 py-2 text-xs font-bold transition ${
                tab === 'password' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => setTab('passkey')}
              className={`flex-1 py-2 text-xs font-bold transition ${
                tab === 'passkey' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Passkey Login
            </button>
          </div>

          {/* Password tab */}
          {tab === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                <input
                  type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
                <input
                  type="password" required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500"
                />
              </div>
              <button
                type="submit" disabled={busy}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition"
              >
                {busy ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Passkey tab */}
          {tab === 'passkey' && (
            <div className="space-y-4">
              {passkeySupported ? (
                <button
                  type="button" disabled={busy}
                  onClick={handlePasskeyLogin}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl border border-slate-700 transition"
                >
                  <Fingerprint size={22} className="text-rose-400" />
                  {busy ? 'Waiting for device…' : 'Sign in with Face ID / Fingerprint'}
                </button>
              ) : (
                <p className="rounded-xl bg-amber-900/30 border border-amber-700 p-3 text-xs text-amber-300">
                  Your device doesn't support Face ID / Fingerprint. Please use the Password Login tab.
                </p>
              )}
            </div>
          )}

          {/* Message */}
          {msg && (
            <p role={isError ? 'alert' : 'status'}
              className={`text-xs font-semibold text-center ${isError ? 'text-rose-400' : 'text-emerald-400'}`}>
              {msg}
            </p>
          )}

          {/* Enable passkey after login */}
          {user?.role === 'admin' && adminUnlocked && passkeySupported && tab === 'password' && (
            <div className="border-t border-slate-700 pt-4">
              <button
                type="button" disabled={busy}
                onClick={handleRegisterPasskey}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-slate-300 hover:text-white border border-slate-700 rounded-xl hover:bg-slate-800 transition"
              >
                <Fingerprint size={16} />
                Enable Face ID / Fingerprint for this device
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-600">
          Rabi's Chic Fashion Hub · Admin Portal
        </p>
      </div>
    </div>
  );
}
