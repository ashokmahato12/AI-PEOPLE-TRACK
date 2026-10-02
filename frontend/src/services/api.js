const API_ROOT = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'people-track-token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body) headers.set('Content-Type', 'application/json');

  let response;
  try {
    response = await fetch(`${API_ROOT}${path}`, { ...options, headers });
  } catch {
    throw new Error('Could not reach the API. Make sure the backend is running on port 4000.');
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && getToken()) {
      clearToken();
      window.dispatchEvent(new Event('auth-expired'));
    }
    throw new Error(body.message || `Request failed (${response.status}).`);
  }
  return body;
}

export const api = {
  login: (email, password) => request('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password })
  }),
  register: (email, password) => request('/auth/register', {
    method: 'POST', body: JSON.stringify({ email, password })
  }),
  resetPassword: (email, recoveryCode, newPassword) => request('/auth/reset-password', {
    method: 'POST', body: JSON.stringify({ email, recoveryCode, newPassword })
  }),
  changePassword: (currentPassword, newPassword) => request('/auth/change-password', {
    method: 'POST', body: JSON.stringify({ currentPassword, newPassword })
  }),
  me: () => request('/auth/me'),
  startSession: (cameraName) => request('/sessions', {
    method: 'POST', body: JSON.stringify({ cameraName })
  }),
  stopSession: (sessionId) => request(`/sessions/${sessionId}/stop`, { method: 'PATCH' }),
  switchSessionCamera: (sessionId, cameraName) => request(`/sessions/${sessionId}/camera`, {
    method: 'PATCH', body: JSON.stringify({ cameraName })
  }),
  recordEvent: (event) => request('/events', {
    method: 'POST', body: JSON.stringify(event)
  }),
  summary: () => request('/summary/today'),
  analytics: (days) => request(`/analytics?days=${days}`),
  history: (filters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    return request(`/history?${params.toString()}`);
  }
};