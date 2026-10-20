import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';
import { getDeviceIdentity } from '../utils/deviceIdentity';

const AuthContext = createContext(null);
const ADMIN_UNLOCK_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

export function AuthProvider({ children }) {
  const [authReady, setAuthReady] = useState(() => !localStorage.getItem('rabi_access_token'));
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminSessionReady, setAdminSessionReady] = useState(() => !localStorage.getItem('rabi_admin_access_token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rabi_user') || 'null');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!localStorage.getItem('rabi_access_token')) {
      setAuthReady(true);
      return;
    }
    api.get('/me')
      .then(({ data }) => {
        setUser(data);
        localStorage.setItem('rabi_user', JSON.stringify(data));
      })
      .catch(() => {
        localStorage.removeItem('rabi_access_token');
        localStorage.removeItem('rabi_user');
        setUser(null);
      })
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('rabi_admin_access_token');
    if (!token) { setAdminUnlocked(false); setAdminSessionReady(true); return undefined; }
    let active = true;
    api.get('/admin/session/check')
      .then(({ data }) => {
        if (!active) return;
        setAdminUnlocked(Boolean(data.valid && data.isOwnDevice));
        if (!data.valid || !data.isOwnDevice) {
          localStorage.removeItem('rabi_admin_access_token');
          localStorage.removeItem('rabi_admin_unlocked_until');
        }
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem('rabi_admin_access_token');
        localStorage.removeItem('rabi_admin_unlocked_until');
        setAdminUnlocked(false);
      })
      .finally(() => { if (active) setAdminSessionReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const syncAdminUnlock = (event) => {
      if (event.key && !['rabi_admin_access_token', 'rabi_admin_unlocked_until'].includes(event.key)) return;
      if (!localStorage.getItem('rabi_admin_access_token')) { setAdminUnlocked(false); setAdminSessionReady(true); return; }
      api.get('/admin/session/check').then(({ data }) => setAdminUnlocked(Boolean(data.valid && data.isOwnDevice))).catch(() => setAdminUnlocked(false));
    };
    window.addEventListener('storage', syncAdminUnlock);
    return () => window.removeEventListener('storage', syncAdminUnlock);
  }, []);

  const login = async (email, password) => {
    const body = new URLSearchParams({ username: email, password });
    const { data } = await api.post('/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    localStorage.setItem('rabi_access_token', data.access_token);
    if (data.admin_access_token) {
      localStorage.setItem('rabi_admin_access_token', data.admin_access_token);
      localStorage.setItem('rabi_admin_unlocked_until', String(Date.now() + ADMIN_UNLOCK_TIMEOUT_MS));
    } else {
      localStorage.removeItem('rabi_admin_access_token');
      localStorage.removeItem('rabi_admin_unlocked_until');
    }
    localStorage.setItem('rabi_user', JSON.stringify(data.user));
    setUser(data.user);
    setAdminUnlocked(Boolean(data.admin_access_token));
    setAuthReady(true);
    return data.user;
  };

  const loginAdmin = async (email, password) => {
    const identity = getDeviceIdentity();
    const { data } = await api.post('/admin/login', {
      email,
      password,
      deviceFingerprint: identity.fingerprint,
      deviceId: identity.deviceId,
      userAgent: navigator.userAgent,
    });
    localStorage.setItem('rabi_access_token', data.access_token);
    localStorage.setItem('rabi_admin_access_token', data.admin_access_token);
    localStorage.setItem('rabi_admin_unlocked_until', String(Date.now() + 30 * 24 * 60 * 60 * 1000));
    localStorage.setItem('rabi_user', JSON.stringify(data.user));
    setUser(data.user);
    setAdminUnlocked(true);
    setAdminSessionReady(true);
    setAuthReady(true);
    return data.user;
  };

  const signup = async (email, password, name) => {
    const { data } = await api.post('/signup', { email, password, name });
    return data;
  };

  const clearLocalSession = () => {
    localStorage.removeItem('rabi_access_token');
    localStorage.removeItem('rabi_admin_access_token');
    localStorage.removeItem('rabi_admin_unlocked_until');
    localStorage.removeItem('rabi_user');
    setUser(null);
    setAdminUnlocked(false);
    setAdminSessionReady(true);
    setAuthReady(true);
  };

  const logout = () => {
    if (user?.role === 'admin' && localStorage.getItem('rabi_admin_access_token')) {
      window.dispatchEvent(new CustomEvent('rabis:request-admin-logout'));
      return;
    }
    clearLocalSession();
  };

  const confirmAdminLogout = async (password) => {
    const identity = getDeviceIdentity();
    await api.post('/admin/logout-confirm', { email: user?.email || '', password, deviceFingerprint: identity.fingerprint });
    clearLocalSession();
  };

  const unlockAdmin = (token) => {
    localStorage.setItem('rabi_admin_access_token', token);
    localStorage.setItem('rabi_admin_unlocked_until', String(Date.now() + ADMIN_UNLOCK_TIMEOUT_MS));
    setAdminUnlocked(true);
    setAdminSessionReady(true);
  };

  const loginWithAdminPasskey = (session) => {
    localStorage.setItem('rabi_access_token', session.access_token);
    localStorage.setItem('rabi_admin_access_token', session.admin_access_token);
    localStorage.setItem('rabi_admin_unlocked_until', String(Date.now() + ADMIN_UNLOCK_TIMEOUT_MS));
    localStorage.setItem('rabi_user', JSON.stringify(session.user));
    setUser(session.user);
    setAdminUnlocked(true);
    setAdminSessionReady(true);
    setAuthReady(true);
  };

  const lockAdmin = () => {
    localStorage.removeItem('rabi_admin_access_token');
    localStorage.removeItem('rabi_admin_unlocked_until');
    setAdminUnlocked(false);
    setAdminSessionReady(true);
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, authReady, adminUnlocked, adminSessionReady, login, loginAdmin, signup, logout, confirmAdminLogout, unlockAdmin, loginWithAdminPasskey, lockAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
