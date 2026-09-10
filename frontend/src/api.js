let csrfToken = '';

export async function api(path, options = {}) {
  const method = options.method || 'GET';
  if (method !== 'GET') {
    const response = await fetch('/api/auth/csrf/', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Unable to establish a secure session. Please try again.');
    csrfToken = (await response.json()).csrfToken;
  }
  const response = await fetch(`/api/${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(method !== 'GET' ? { 'X-CSRFToken': csrfToken } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (response.status === 204) return null;
  const data = await response
    .json()
    .catch(() => ({ detail: 'The server could not process this request. Please try again.' }));
  if (!response.ok) {
    const error = new Error(data.detail || 'Please check the highlighted fields.');
    error.fields = data;
    error.status = response.status;
    throw error;
  }
  return data;
}
