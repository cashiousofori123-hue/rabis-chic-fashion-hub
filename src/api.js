import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rabi_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;