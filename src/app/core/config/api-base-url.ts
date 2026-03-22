import { environment } from '../../../environments/environment';

const normalizeBaseUrl = (value: string): string => String(value || '').trim().replace(/\/+$/, '');

const isLocalhostUrl = (value: string): boolean => {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return ['localhost', '127.0.0.1'].includes(parsed.hostname);
  } catch {
    return /localhost|127\.0\.0\.1/i.test(value);
  }
};

export const resolveApiBaseUrl = (): string => {
  const configured = normalizeBaseUrl(environment.apiBaseUrl);
  const origin = typeof window !== 'undefined' ? normalizeBaseUrl(window.location.origin) : '';

  if (environment.production && isLocalhostUrl(configured) && origin) {
    return origin;
  }

  return configured || origin;
};
