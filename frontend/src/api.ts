import { API_BASE_URL } from './config';
import type { Attempt, AuthResponse, Dashboard, ListItem, ProblemWithLatestAttempt, UpsertAttemptRequest } from './types';
import type { paths } from './api/generated/openapi';

type LoginPayload = paths['/auth/login']['post']['requestBody']['content']['application/json'];
type SignupPayload = paths['/auth/signup']['post']['requestBody']['content']['application/json'];
type CreateListPayload = paths['/lists']['post']['requestBody']['content']['application/json'];

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function joinApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    return `${API_BASE_URL}${normalizedPath}`;
  }
  return `${API_BASE_URL}${normalizedPath}`;
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
    throw new ApiError('Failed to fetch API. If running local dev, ensure backend is running on :8080 and frontend uses the Vite /api proxy.', 0);
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
  signup: (payload: SignupPayload) =>
    request<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: LoginPayload) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  getDashboard: (token: string) => request<Dashboard>('/dashboard', {}, token),
  getLists: (token: string) => request<ListItem[]>('/lists', {}, token),
  createList: (token: string, payload: CreateListPayload) =>
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
