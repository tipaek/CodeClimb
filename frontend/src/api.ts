import { API_BASE_URL } from './config';
import type { Attempt, AuthResponse, CreateListRequest, Dashboard, ListItem, LoginRequest, ProblemWithLatestAttempt, SignupRequest, UpsertAttemptRequest } from './types';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function joinApiUrl(path: string): string {
  const normalizedBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!normalizedBase) {
    return normalizedPath;
  }
  return `${normalizedBase}${normalizedPath}`;
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(joinApiUrl(path), { ...init, headers });
  } catch {
    throw new ApiError('Failed to fetch API. In local dev set VITE_API_BASE_URL (for example http://localhost:8080).', 0);
  }
  if (!response.ok) {
    const text = await response.text();
    try {
      const json = JSON.parse(text) as { message?: string };
      throw new ApiError(json.message ?? `Request failed (${response.status})`, response.status);
    } catch {
      throw new ApiError(text || `Request failed (${response.status})`, response.status);
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  signup: (payload: SignupRequest) =>
    request<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: LoginRequest) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  getDashboard: (token: string, scope: 'latest' | 'list' | 'all' = 'latest', listId?: string | null) => {
    const params = new URLSearchParams({ scope });
    if (scope === 'list' && listId) {
      params.set('listId', listId);
    }
    return request<Dashboard>(`/dashboard?${params.toString()}`, {}, token);
  },
  getLists: (token: string) => request<ListItem[]>('/lists', {}, token),
  createList: (token: string, payload: CreateListRequest) =>
    request<ListItem>('/lists', { method: 'POST', body: JSON.stringify(payload) }, token),
  getProblems: (token: string, listId: string) => request<ProblemWithLatestAttempt[]>(`/lists/${listId}/problems`, {}, token),
  getAttemptsHistory: (token: string, listId: string, neetId: number) =>
    request<Attempt[]>(`/lists/${listId}/problems/${neetId}/attempts`, {}, token),
  createAttempt: (token: string, listId: string, neetId: number, payload: UpsertAttemptRequest) =>
    request<Attempt>(`/lists/${listId}/problems/${neetId}/attempts`, { method: 'POST', body: JSON.stringify(payload) }, token),
  patchAttempt: (token: string, attemptId: string, payload: UpsertAttemptRequest) =>
    request<Attempt>(`/attempts/${attemptId}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),
  deleteAttempt: (token: string, attemptId: string) => request<void>(`/attempts/${attemptId}`, { method: 'DELETE' }, token),
};
