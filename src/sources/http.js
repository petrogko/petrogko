const redact = url => String(url).replace(/appid=[^&]*/g, 'appid=***');

export class HttpError extends Error {
  constructor(status, url) {
    super(`HTTP ${status} for ${redact(url)}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** GET + JSON with a timeout and `retries` extra attempts. Never leaks `appid` in messages. */
export async function fetchJson(fetchImpl, url, { headers = {}, timeoutMs = 10_000, retries = 1 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new HttpError(res.status, url);
      return await res.json();
    } catch (err) {
      lastError = err instanceof HttpError ? err : new Error(redact(err?.message ?? err));
    }
  }
  throw lastError;
}
