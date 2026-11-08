export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
/** One client owns the session refresh lock for JSON requests and file downloads. */
export class ApiClient {
  private refreshing: Promise<boolean> | null = null;

  constructor(
    private readonly base = '/api/v1',
    private readonly fetcher: typeof fetch = (...args) => fetch(...args),
  ) {}

  private refreshSession() {
    this.refreshing ??= this.fetcher(`${this.base}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'x-nexus-csrf': '1' },
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }
  private sessionExpired() {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('nexus:session-expired'));
  }
  private async request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.base}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          'x-nexus-csrf': '1',
          ...options.headers,
        },
      });
    } catch {
      throw new ApiError(0, 'Unable to reach Nexus. Check that the API is running and try again.');
    }
    if (
      response.status === 401 &&
      retry &&
      !/^\/auth\/(login|refresh|logout|forgot-password)(?:\?|$)/.test(path)
    ) {
      if (await this.refreshSession()) return this.request<T>(path, options, false);
    }
    if (!response.ok) {
      if (
        response.status === 401 &&
        !/^\/auth\/(login|refresh|logout|forgot-password)(?:\?|$)/.test(path)
      )
        this.sessionExpired();
      const error: { message?: string | string[]; error?: string } = await response
        .json()
        .catch(() => ({}));
      throw new ApiError(
        response.status,
        Array.isArray(error.message)
          ? error.message.join('. ')
          : error.message || error.error || 'Something went wrong. Please try again.',
        error,
      );
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
  get<T>(path: string) {
    return this.request<T>(path);
  }
  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }
  delete<T = void>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
  async download(path: string, filename: string) {
    let response = await this.fetcher(`${this.base}${path}`, { credentials: 'include' });
    if (response.status === 401 && (await this.refreshSession())) {
      response = await this.fetcher(`${this.base}${path}`, { credentials: 'include' });
    }
    if (response.status === 401) this.sessionExpired();
    if (!response.ok) throw new ApiError(response.status, 'The export could not be downloaded.');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}

export const api = new ApiClient();
