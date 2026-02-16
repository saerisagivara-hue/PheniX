const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getToken() {
  return localStorage.getItem('phoenix_token');
}

function getHeaders(includeAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (includeAuth && getToken()) headers['Authorization'] = `Bearer ${getToken()}`;
  return headers;
}

export async function api(endpoint, options = {}) {
  const { method = 'GET', body, auth = true } = options;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: getHeaders(auth),
    ...(body && { body: JSON.stringify(body) }),
  });
  const data = res.ok ? await res.json().catch(() => ({})) : null;
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = data?.code;
    err.details = data?.details;
    throw err;
  }
  return data;
}

export const auth = {
  register: (username, email, password) =>
    api('/auth/register', { method: 'POST', body: { username, email, password }, auth: false }),
  login: (email, password) =>
    api('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
};

export const bots = {
  list: () => api('/bots'),
  get: (id) => api(`/bots/${id}`),
  create: (data) => api('/bots', { method: 'POST', body: data }),
  update: (id, data) => api(`/bots/${id}`, { method: 'PATCH', body: data }),
  delete: (id) => api(`/bots/${id}`, { method: 'DELETE' }),
  like: (id) => api(`/bots/${id}/like`, { method: 'POST' }),
  messages: (id) => api(`/bots/${id}/messages`),
  sendMessage: (id, content) => api(`/bots/${id}/messages`, { method: 'POST', body: { content } }),
};

export const users = {
  me: () => api('/users/me'),
  getByUsername: (username) => api(`/users/${username}`),
};

export function setToken(token) {
  if (token) localStorage.setItem('phoenix_token', token);
  else localStorage.removeItem('phoenix_token');
}

export function hasToken() {
  return !!getToken();
}
