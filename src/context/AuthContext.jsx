import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';
import { getDeviceIdentity } from '../utils/deviceIdentity';

const AuthContext = createContext(null);
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
        }
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem('rabi_admin_access_token');
        setAdminUnlocked(false);
      })
      .finally(() => { if (active) setAdminSessionReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const syncAdminUnlock = (event) => {
      if (event.key && event.key !== 'rabi_admin_access_token') return;
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
    } else {
      localStorage.removeItem('rabi_admin_access_token');
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
    localStorage.setItem('rabi_user', JSON.stringify(data.user));
    localStorage.setItem('lastAdminEmail', data.user.email);
    setUser(data.user);
    setAdminUnlocked(true);
    setAdminSessionReady(true);
    setAuthReady(true);
    return data.user;
  };

  const clearLocalSession = () => {
    localStorage.removeItem('rabi_access_token');
    localStorage.removeItem('rabi_admin_access_token');
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
    await api.post('/admin/logout', { email: user?.email || '', password, deviceFingerprint: identity.fingerprint });
    clearLocalSession();
  };

  const unlockAdmin = (token) => {
    localStorage.setItem('rabi_admin_access_token', token);
    setAdminUnlocked(true);
    setAdminSessionReady(true);
  };

  const loginWithAdminPasskey = (session) => {
    localStorage.setItem('rabi_access_token', session.access_token);
    localStorage.setItem('rabi_admin_access_token', session.admin_access_token);
    localStorage.setItem('rabi_user', JSON.stringify(session.user));
    localStorage.setItem('lastAdminEmail', session.user.email);
    setUser(session.user);
    setAdminUnlocked(true);
    setAdminSessionReady(true);
    setAuthReady(true);
  };

  const lockAdmin = () => {
    localStorage.removeItem('rabi_admin_access_token');
    setAdminUnlocked(false);
    setAdminSessionReady(true);
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, authReady, adminUnlocked, adminSessionReady, login, loginAdmin, logout, confirmAdminLogout, unlockAdmin, loginWithAdminPasskey, lockAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
