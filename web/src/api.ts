const base = import.meta.env.VITE_API_URL || 'http://localhost:8001'
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const xsrf = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN='))?.split('=').slice(1).join('=')
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...(init.headers as Record<string, string> || {}) }
  if (xsrf) headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf)
  const response = await fetch(`${base}/api${path}`, { credentials: 'include', ...init, headers })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || `Request failed (${response.status})`)
  }
  return response.status === 204 ? undefined as T : response.json()
}
export type User = { id: number; name: string; email: string }
export type Doc = { id: number; title: string; content: any; updated_at: string; owner?: User; owner_id: number }
export const api = {
  csrf: () => fetch(`${base}/sanctum/csrf-cookie`, { credentials: 'include' }),
  me: () => request<{ user: User }>('/me'),
  login: async (email: string, password: string) => { await api.csrf(); return request('/login', { method: 'POST', body: JSON.stringify({ email, password }) }) },
  register: async (name: string, email: string, password: string) => { await api.csrf(); return request('/register', { method: 'POST', body: JSON.stringify({ name, email, password, password_confirmation: password }) }) },
  logout: () => request('/logout', { method: 'POST' }),
  owned: () => request<{ documents: Doc[] }>('/documents/owned'),
  shared: () => request<{ documents: Doc[] }>('/documents/shared'),
  get: (id: number) => request<{ document: Doc }>(`/documents/${id}`),
  create: (title: string, content: any) => request<{ document: Doc }>('/documents', { method: 'POST', body: JSON.stringify({ title, content }) }),
  update: (id: number, data: Partial<Pick<Doc, 'title' | 'content'>>) => request<{ document: Doc }>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  share: (id: number, email: string) => request(`/documents/${id}/shares`, { method: 'POST', body: JSON.stringify({ email }) }),
}
