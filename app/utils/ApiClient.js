// @flow
import { map } from 'lodash';
import invariant from 'invariant';
import stores from 'stores';

type Options = {
  baseUrl?: string,
};

class ApiClient {
  baseUrl: string;
  userAgent: string;

  constructor(options: Options = {}) {
    this.baseUrl = options.baseUrl || '/api';
    this.userAgent = 'OutlineFrontend';
  }

  fetch = async (
    path: string,
    method: string,
    data: ?Object,
    options: Object = {}
  ) => {
    let body;
    let modifiedPath;

    if (method === 'GET') {
      if (data) {
        modifiedPath = `${path}?${data && this.constructQueryString(data)}`;
      } else {
        modifiedPath = path;
      }
    } else if (method === 'POST' || method === 'PUT') {
      body = data ? JSON.stringify(data) : undefined;
    }

    // Construct headers
    const headers = new Headers({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
    if (stores.auth.authenticated) {
      invariant(stores.auth.token, 'JWT token not set properly');
      headers.set('Authorization', `Bearer ${stores.auth.token}`);
    }

    // $FlowFixMe don't care much about this right now
    const response = await fetch(this.baseUrl + (modifiedPath || path), {
      method,
      body,
      headers,
      redirect: 'follow',
      credentials: 'omit',
    });

    if (response.status >= 200 && response.status < 300) {
      return response.json();
    }

    // Handle 401, log out user
    if (response.status === 401) {
      stores.auth.logout();
      return;
    }

    // Handle failed responses
    const error = {};
    error.statusCode = response.status;
    error.response = response;

    try {
      const data = await response.json();
      error.message = data.message || '';
    } catch (_err) {
      // we're trying to parse an error so JSON may not be valid
    }

    throw error;
  };

  get = (path: string, data: ?Object, options?: Object) => {
    return this.fetch(path, 'GET', data, options);
  };

  post = (path: string, data: ?Object, options?: Object) => {
    return this.fetch(path, 'POST', data, options);
  };

  // Helpers
  constructQueryString = (data: Object) => {
    return map(data, (v, k) => {
      return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    }).join('&');
  };
}

export default ApiClient;

// In case you don't want to always initiate, just import with `import { client } ...`
export const client = new ApiClient();
