export class RetryConfig {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.initialDelayMs = options.initialDelayMs ?? 1000;
    this.maxDelayMs = options.maxDelayMs ?? 30000;
    this.backoffMultiplier = options.backoffMultiplier ?? 2;
    this.jitterFraction = options.jitterFraction ?? 0.1;
    this.retryableStatusCodes = options.retryableStatusCodes ?? [408, 429, 500, 502, 503, 504];
    this.retryableErrors = options.retryableErrors ?? ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'];
  }

  shouldRetry(statusCode, error, attemptNumber) {
    if (attemptNumber >= this.maxRetries) {
      return false;
    }

    if (error) {
      const errorCode = error.code || error.message || '';
      return this.retryableErrors.some(code => errorCode.includes(code));
    }

    if (statusCode) {
      return this.retryableStatusCodes.includes(statusCode);
    }

    return false;
  }

  calculateDelay(attemptNumber) {
    const exponentialDelay = this.initialDelayMs * Math.pow(this.backoffMultiplier, attemptNumber);
    const cappedDelay = Math.min(exponentialDelay, this.maxDelayMs);

    const jitterAmount = cappedDelay * this.jitterFraction;
    const jitter = (Math.random() - 0.5) * 2 * jitterAmount;

    return Math.max(0, Math.floor(cappedDelay + jitter));
  }

  getConfig() {
    return {
      maxRetries: this.maxRetries,
      initialDelayMs: this.initialDelayMs,
      maxDelayMs: this.maxDelayMs,
      backoffMultiplier: this.backoffMultiplier,
      jitterFraction: this.jitterFraction,
      retryableStatusCodes: [...this.retryableStatusCodes],
      retryableErrors: [...this.retryableErrors]
    };
  }
}
