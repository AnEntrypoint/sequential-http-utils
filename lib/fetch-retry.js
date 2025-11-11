import { RetryConfig } from './retry-config.js';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchWithRetry(url, options = {}, retryConfig = null) {
  const config = retryConfig || new RetryConfig();

  let lastError = null;
  let lastResponse = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    if (attempt > 0) {
      const delayMs = config.calculateDelay(attempt - 1);
      await sleep(delayMs);
    }

    try {
      const response = await fetch(url, options);
      lastResponse = response;

      if (response.ok) {
        return response;
      }

      if (!config.shouldRetry(response.status, null, attempt)) {
        return response;
      }
    } catch (error) {
      lastError = error;

      if (!config.shouldRetry(null, error, attempt)) {
        throw error;
      }
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError || new Error('Fetch failed after all retries');
}

export function createFetchWithRetry(retryConfig = null) {
  const config = retryConfig || new RetryConfig();

  return async function customFetch(url, options = {}) {
    return fetchWithRetry(url, options, config);
  };
}
