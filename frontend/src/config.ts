const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = envApiBaseUrl || (import.meta.env.DEV ? 'http://localhost:8080' : '');

export const AUTH_STORAGE_KEY = 'codeclimb.auth.token';
