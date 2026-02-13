const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const isLocalDirectBackend =
  envApiBaseUrl === 'http://localhost:8080' || envApiBaseUrl === 'http://127.0.0.1:8080';

export const API_BASE_URL = import.meta.env.DEV && isLocalDirectBackend ? '/api' : envApiBaseUrl ?? '/api';

export const AUTH_STORAGE_KEY = 'codeclimb.auth.token';
