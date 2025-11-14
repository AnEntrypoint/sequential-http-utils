# tasker-http-utils

HTTP utilities for tasker-sequential with robust retry logic, response parsing, and request building.

## Architecture

```
index.js                    # Main exports
lib/
├── retry-config.js         # Retry configuration with exponential backoff
├── fetch-retry.js          # Fetch wrapper with automatic retries
├── response-parser.js      # Response parsing utilities
└── request-builder.js      # Fluent request builder
```

## Core Modules

### 1. RetryConfig (`lib/retry-config.js`)

Configures retry behavior with exponential backoff and jitter.

**Constructor Options:**
- `maxRetries` (default: 3) - Maximum retry attempts
- `initialDelayMs` (default: 1000) - Initial delay between retries
- `maxDelayMs` (default: 30000) - Maximum delay cap
- `backoffMultiplier` (default: 2) - Exponential backoff multiplier
- `jitterFraction` (default: 0.1) - Random jitter (±10%)
- `retryableStatusCodes` (default: [408, 429, 500, 502, 503, 504])
- `retryableErrors` (default: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'])

**Methods:**
- `shouldRetry(statusCode, error, attemptNumber)` - Determines if retry should occur
- `calculateDelay(attemptNumber)` - Calculates delay with exponential backoff + jitter
- `getConfig()` - Returns current configuration

**Example:**
```javascript
const config = new RetryConfig({
  maxRetries: 5,
  initialDelayMs: 2000,
  retryableStatusCodes: [429, 503]
});
```

### 2. fetchWithRetry (`lib/fetch-retry.js`)

Wraps native fetch with automatic retry logic.

**Functions:**

#### `fetchWithRetry(url, options, retryConfig)`
- `url` - Request URL
- `options` - Standard fetch options
- `retryConfig` - RetryConfig instance (optional)
- Returns: Response object or throws error

**Behavior:**
- Retries on network errors and retryable status codes
- Uses exponential backoff with jitter
- Returns first successful response (status 2xx)
- Returns last response if all retries fail on HTTP errors
- Throws if all retries fail on network errors

#### `createFetchWithRetry(retryConfig)`
Creates a custom fetch function with preset retry configuration.

**Example:**
```javascript
// Direct usage
const response = await fetchWithRetry('https://api.example.com/data', {}, config);

// Create reusable fetch
const myFetch = createFetchWithRetry(new RetryConfig({ maxRetries: 5 }));
const response = await myFetch('https://api.example.com/data');
```

### 3. ResponseParser (`lib/response-parser.js`)

Parses fetch responses with automatic content-type detection.

**Error Class:**
- `ResponseParseError` - Custom error with statusCode and originalError properties

**Functions:**

#### `parseResponse(response)`
- Parses response based on Content-Type header
- Auto-detects JSON vs text
- Returns standardized object: `{ status, statusText, headers, data }`
- Throws `ResponseParseError` on parse failure

#### `parseResponseSafe(response)`
- Same as `parseResponse` but never throws
- Returns error in response object: `{ status, statusText, headers, data, error }`

**Example:**
```javascript
// Strict parsing (throws on error)
const parsed = await parseResponse(response);
console.log(parsed.data); // JSON object or text string

// Safe parsing (catches errors)
const parsed = await parseResponseSafe(response);
if (parsed.error) {
  console.error('Parse failed:', parsed.error);
}
```

### 4. RequestBuilder (`lib/request-builder.js`)

Fluent API for building HTTP requests.

**Constructor:**
```javascript
new RequestBuilder(url, method = 'GET')
```

**Methods (chainable):**

| Method | Description |
|--------|-------------|
| `setHeader(name, value)` | Set single header |
| `setHeaders(headers)` | Set multiple headers |
| `setBody(body)` | Set request body (auto-detects JSON) |
| `setJsonBody(data)` | Set JSON body with Content-Type |
| `setFormBody(data)` | Set URL-encoded form data |
| `setTimeout(ms)` | Set request timeout |
| `setAbortSignal(signal)` | Set AbortSignal |
| `addAuthHeader(token, scheme='Bearer')` | Add Authorization header |
| `addCustomHeader(name, value)` | Alias for setHeader |
| `build()` | Build options object |
| `send()` | Execute request and return response |

**Example:**
```javascript
// Using builder
const response = await new RequestBuilder('https://api.example.com/users', 'POST')
  .setJsonBody({ name: 'John', email: 'john@example.com' })
  .addAuthHeader('abc123')
  .setTimeout(5000)
  .send();

// Or use helper function
const builder = buildRequest('https://api.example.com/data')
  .setHeader('X-Custom', 'value');
const options = builder.build();
const response = await fetch(builder.url, options);
```

## Complete Usage Example

```javascript
import {
  RetryConfig,
  fetchWithRetry,
  parseResponse,
  RequestBuilder
} from 'tasker-http-utils';

// Configure retry strategy
const retryConfig = new RetryConfig({
  maxRetries: 3,
  initialDelayMs: 1000,
  retryableStatusCodes: [429, 503]
});

// Build request
const request = new RequestBuilder('https://api.example.com/data', 'POST')
  .setJsonBody({ query: 'test' })
  .addAuthHeader('my-token')
  .setTimeout(10000)
  .build();

// Fetch with retry
const response = await fetchWithRetry(
  'https://api.example.com/data',
  request,
  retryConfig
);

// Parse response
const parsed = await parseResponse(response);
console.log(parsed.data);
```

## Named Exports

Import individual modules:
```javascript
import { RetryConfig } from 'tasker-http-utils/retry';
import { fetchWithRetry } from 'tasker-http-utils/fetch';
import { parseResponse } from 'tasker-http-utils/response';
import { RequestBuilder } from 'tasker-http-utils/request';
```

## Key Features

- **Exponential Backoff**: Configurable backoff with jitter to prevent thundering herd
- **Smart Retries**: Retry only on transient errors (5xx, timeouts, network issues)
- **Fluent API**: Chain method calls for readable request building
- **Auto Content-Type**: Automatic JSON/form detection and header setting
- **Type Safety**: Consistent error handling with custom error classes
- **Modular**: Import only what you need via named exports

## Error Handling Patterns

1. **Network Errors**: Throws after max retries exhausted
2. **HTTP Errors**: Returns response object (check `response.ok`)
3. **Parse Errors**: Throws `ResponseParseError` (or use `parseResponseSafe`)

```javascript
try {
  const response = await fetchWithRetry(url, options, config);

  if (!response.ok) {
    // HTTP error (4xx, 5xx after retries)
    console.error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const parsed = await parseResponse(response);
  // Success
} catch (error) {
  if (error instanceof ResponseParseError) {
    // JSON parse failure
    console.error('Parse error:', error.message, error.statusCode);
  } else {
    // Network error (after all retries)
    console.error('Network error:', error.message);
  }
}
```

## Implementation Notes

- **Delay Calculation**: `delay = min(initialDelay × multiplier^attempt, maxDelay) ± jitter`
- **Jitter Range**: ±10% by default (e.g., 1000ms becomes 900-1100ms)
- **Attempt Counting**: Attempt 0 = initial request, attempts 1-N = retries
- **Default Retryable Codes**: 408 (Timeout), 429 (Rate Limit), 5xx (Server Errors)
- **Body Serialization**: Objects auto-convert to JSON strings in `build()`
- **Headers Normalization**: Headers converted to plain object via `Object.fromEntries()`

## License

MIT
