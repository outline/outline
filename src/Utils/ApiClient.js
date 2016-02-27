import _ from 'lodash';

import Auth from './Auth';
import Constants from '../Constants';

class ApiClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || Constants.API_BASE_URL;
    this.userAgent = options.userAgent || Constants.API_USER_AGENT;
  }

  fetch = (path, method, data) => {
    let body;
    let modifiedPath;

    if (method === 'GET') {
      modifiedPath = path + this.constructQueryString(data);
    } else if (method === 'POST' || method === 'PUT') {
      body = JSON.stringify(data);
    }

    // Construct headers
    const headers = new Headers({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': this.userAgent,
    });
    if (Auth.getToken()) {
      headers.set('Authorization', `JWT ${Auth.getToken()}`);
    }

    // Construct request
    const request = fetch(this.baseUrl + (modifiedPath || path), {
      method,
      body,
      headers,
      redirect: 'follow',
    });

    // Handle request promises and return a new promise
    return new Promise((resolve, reject) => {
      request
      .then((response) => {
        // Handle successful responses
        if (response.status >= 200 && response.status < 300) {
          return response;
        }

        // Handle 401, log out user
        if (response.status === 401) {
          Auth.logout();
        }

        // Handle failed responses
        let error;
        try {
          // Expect API to return JSON
          error = JSON.parse(response);
        } catch (e) {
          // Expect call to fail without JSON response
          error = { error: response.statusText };
        }

        error.statusCode = response.status;
        error.response = response;
        reject(error);
      })
      .then((response) => {
        return response.json();
      })
      .then((json) => {
        resolve(json);
      })
      .catch(() => {
        reject({ error: 'Unknown error' });
      });
    });
  }

  post = (path, data) => {
    return this.fetch(path, 'POST', data);
  }

  put = (path, data) => {
    return this.fetch(path, 'PUT', data);
  }

  get = (path, data) => {
    return this.fetch(path, 'GET', data);
  }

  delete = (path, data) => {
    return this.fetch(path, 'DELETE', data);
  }

  // Helpers

  constructQueryString = (data) => {
    return _.map(data, (v, k) => {
      return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    }).join('&');
  };
}

export default ApiClient;

// In case you don't want to always initiate, just import with `import { client } ...`
const client = new ApiClient();
export { client };
