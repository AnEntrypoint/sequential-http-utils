export class ResponseParseError extends Error {
  constructor(message, statusCode = null, originalError = null) {
    super(message);
    this.name = 'ResponseParseError';
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

export async function parseResponse(response) {
  if (!response) {
    throw new ResponseParseError('Response object is null or undefined');
  }

  const contentType = response.headers?.get?.('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (isJson) {
    try {
      const data = await response.json();
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries?.() || []),
        data
      };
    } catch (error) {
      throw new ResponseParseError(
        `Failed to parse JSON response: ${error.message}`,
        response.status,
        error
      );
    }
  }

  try {
    const text = await response.text();
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries?.() || []),
      data: text
    };
  } catch (error) {
    throw new ResponseParseError(
      `Failed to read response body: ${error.message}`,
      response.status,
      error
    );
  }
}

export async function parseResponseSafe(response) {
  try {
    return await parseResponse(response);
  } catch (error) {
    if (error instanceof ResponseParseError) {
      return {
        status: error.statusCode || response?.status || 0,
        statusText: response?.statusText || 'Unknown',
        headers: {},
        data: null,
        error: error.message
      };
    }

    return {
      status: response?.status || 0,
      statusText: response?.statusText || 'Unknown',
      headers: {},
      data: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
