import type { ApiErrorBody, RequestOptions } from '../types/api';

const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody: ApiErrorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || 'Request failed');
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Request failed');
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions): Promise<T> =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(
    endpoint: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(
    endpoint: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: RequestOptions): Promise<T> =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

export { API_BASE_URL };
