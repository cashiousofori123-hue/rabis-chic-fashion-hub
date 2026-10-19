import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rabi_user') || 'null');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!localStorage.getItem('rabi_access_token')) return;
    api.get('/me')
      .then(({ data }) => {
        setUser(data);
        localStorage.setItem('rabi_user', JSON.stringify(data));
      })
      .catch(() => {
        localStorage.removeItem('rabi_access_token');
        localStorage.removeItem('rabi_user');
        setUser(null);
      });
  }, []);

  const login = async (email, password) => {
    const body = new URLSearchParams({ username: email, password });
    const { data } = await api.post('/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    localStorage.setItem('rabi_access_token', data.access_token);
    localStorage.setItem('rabi_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const signup = async (email, password, name) => {
    const { data } = await api.post('/signup', { email, password, name });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('rabi_access_token');
    localStorage.removeItem('rabi_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}