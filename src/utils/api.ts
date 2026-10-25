const TOKEN_KEY = 'surveypulse_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

/**
 * Universal apiFetch that reliably attaches credentials and Authorization Bearer header,
 * handles request timeouts, network duration issues, offline states, and transient connection drops.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = 25000
): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init?.headers);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Check online status before initiating request
  if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
    throw new Error('No internet connection. Please verify your network and try again.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const fetchOptions: RequestInit = {
    ...init,
    credentials: 'include',
    headers,
    signal: init?.signal || controller.signal,
  };

  try {
    const response = await fetch(input, fetchOptions);
    return response;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Network request timed out. The server took too long to respond. Please check your connection.');
    }

    // Auto-retry once for idempotent requests (GET or undefined method) on transient network failure
    const isGet = !init?.method || init.method.toUpperCase() === 'GET';
    if (isGet) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return await fetch(input, {
          ...init,
          credentials: 'include',
          headers,
        });
      } catch {
        // Fall back to original error message
      }
    }

    throw new Error(err.message || 'Network communication error. Please check your internet connection.');
  } finally {
    clearTimeout(timeoutId);
  }
}
