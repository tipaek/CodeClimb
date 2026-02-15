const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const envProxyTarget = import.meta.env.VITE_PROXY_TARGET?.trim();

export const API_BASE_URL = envApiBaseUrl || envProxyTarget || (import.meta.env.DEV ? 'http://localhost:8080' : '');

export const AUTH_STORAGE_KEY = 'codeclimb.auth.token';
