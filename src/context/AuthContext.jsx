import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);
const ADMIN_UNLOCK_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

function hasValidAdminUnlock() {
  const expiresAt = Number(localStorage.getItem('rabi_admin_unlocked_until') || 0);
  const token = localStorage.getItem('rabi_admin_access_token');
  if (token && (!expiresAt || expiresAt > Date.now())) return true;
  localStorage.removeItem('rabi_admin_access_token');
  localStorage.removeItem('rabi_admin_unlocked_until');
  return false;
}

export function AuthProvider({ children }) {
  const [authReady, setAuthReady] = useState(() => !localStorage.getItem('rabi_access_token'));
  const [adminUnlocked, setAdminUnlocked] = useState(hasValidAdminUnlock);
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
    const syncAdminUnlock = (event) => {
      if (event.key && !['rabi_admin_access_token', 'rabi_admin_unlocked_until'].includes(event.key)) return;
      setAdminUnlocked(hasValidAdminUnlock());
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

  const signup = async (email, password, name) => {
    const { data } = await api.post('/signup', { email, password, name });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('rabi_access_token');
    localStorage.removeItem('rabi_admin_access_token');
    localStorage.removeItem('rabi_admin_unlocked_until');
    localStorage.removeItem('rabi_user');
    setUser(null);
    setAdminUnlocked(false);
    setAuthReady(true);
  };

  const unlockAdmin = (token) => {
    localStorage.setItem('rabi_admin_access_token', token);
    localStorage.setItem('rabi_admin_unlocked_until', String(Date.now() + ADMIN_UNLOCK_TIMEOUT_MS));
    setAdminUnlocked(true);
  };

  const loginWithAdminPasskey = (session) => {
    localStorage.setItem('rabi_access_token', session.access_token);
    localStorage.setItem('rabi_admin_access_token', session.admin_access_token);
    localStorage.setItem('rabi_admin_unlocked_until', String(Date.now() + ADMIN_UNLOCK_TIMEOUT_MS));
    localStorage.setItem('rabi_user', JSON.stringify(session.user));
    setUser(session.user);
    setAdminUnlocked(true);
    setAuthReady(true);
  };

  const lockAdmin = () => {
    localStorage.removeItem('rabi_admin_access_token');
    localStorage.removeItem('rabi_admin_unlocked_until');
    setAdminUnlocked(false);
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, authReady, adminUnlocked, login, signup, logout, unlockAdmin, loginWithAdminPasskey, lockAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
