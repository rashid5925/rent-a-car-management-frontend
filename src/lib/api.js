import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach the JWT on every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('racm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, drop the session and bounce to login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('racm_token');
      localStorage.removeItem('racm_user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Helper that surfaces the server's friendly message to toasts.
export function apiError(err, fallback = 'Something went wrong') {
  return err?.response?.data?.message || err?.message || fallback;
}

export default api;
