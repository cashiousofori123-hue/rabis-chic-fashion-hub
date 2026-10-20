import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:8000'),
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = config.useRegularAuth
    ? localStorage.getItem('rabi_access_token')
    : localStorage.getItem('rabi_admin_access_token') || localStorage.getItem('rabi_access_token');
  delete config.useRegularAuth;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;