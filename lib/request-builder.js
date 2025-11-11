export class RequestBuilder {
  constructor(url, method = 'GET') {
    this.url = url;
    this.method = method;
    this.headers = {};
    this.body = null;
    this.timeout = null;
    this.signal = null;
  }

  setHeader(name, value) {
    this.headers[name] = value;
    return this;
  }

  setHeaders(headers) {
    Object.assign(this.headers, headers);
    return this;
  }

  setBody(body) {
    this.body = body;

    if (typeof body === 'object' && body !== null) {
      this.setHeader('Content-Type', 'application/json');
    }

    return this;
  }

  setJsonBody(data) {
    this.body = JSON.stringify(data);
    this.setHeader('Content-Type', 'application/json');
    return this;
  }

  setFormBody(data) {
    const params = new URLSearchParams(data);
    this.body = params.toString();
    this.setHeader('Content-Type', 'application/x-www-form-urlencoded');
    return this;
  }

  setTimeout(ms) {
    this.timeout = ms;
    return this;
  }

  setAbortSignal(signal) {
    this.signal = signal;
    return this;
  }

  addAuthHeader(token, scheme = 'Bearer') {
    this.setHeader('Authorization', `${scheme} ${token}`);
    return this;
  }

  addCustomHeader(name, value) {
    this.setHeader(name, value);
    return this;
  }

  build() {
    const options = {
      method: this.method,
      headers: this.headers
    };

    if (this.body) {
      options.body = typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }

    if (this.timeout) {
      options.timeout = this.timeout;
    }

    if (this.signal) {
      options.signal = this.signal;
    }

    return options;
  }

  async send() {
    const options = this.build();
    const response = await fetch(this.url, options);
    return response;
  }
}

export function buildRequest(url, method = 'GET') {
  return new RequestBuilder(url, method);
}
