// @flow
import invariant from "invariant";
import { map, trim } from "lodash";
import stores from "stores";
import download from "./download";
import {
  AuthorizationError,
  NetworkError,
  NotFoundError,
  OfflineError,
  RequestError,
  UpdateRequiredError,
} from "./errors";

type Options = {
  baseUrl?: string,
};

class ApiClient {
  baseUrl: string;
  userAgent: string;

  constructor(options: Options = {}) {
    this.baseUrl = options.baseUrl || "/api";
    this.userAgent = "OutlineFrontend";
  }

  fetch = async (
    path: string,
    method: string,
    data: ?Object | FormData | void,
    options: Object = {}
  ) => {
    let body;
    let modifiedPath;
    let urlToFetch;
    let isJson;

    if (method === "GET") {
      if (data) {
        modifiedPath = `${path}?${data && this.constructQueryString(data)}`;
      } else {
        modifiedPath = path;
      }
    } else if (method === "POST" || method === "PUT") {
      body = data || undefined;

      // Only stringify data if its a normal object and
      // not if it's [object FormData], in addition to
      // toggling Content-Type to application/json
      if (
        typeof data === "object" &&
        (data || "").toString() === "[object Object]"
      ) {
        isJson = true;
        body = JSON.stringify(data);
      }
    }

    if (path.match(/^http/)) {
      urlToFetch = modifiedPath || path;
    } else {
      urlToFetch = this.baseUrl + (modifiedPath || path);
    }

    let headerOptions: any = {
      Accept: "application/json",
      "cache-control": "no-cache",
      "x-editor-version": EDITOR_VERSION,
      pragma: "no-cache",
    };
    // for multipart forms or other non JSON requests fetch
    // populates the Content-Type without needing to explicitly
    // set it.
    if (isJson) {
      headerOptions["Content-Type"] = "application/json";
    }
    const headers = new Headers(headerOptions);

    if (stores.auth.authenticated) {
      invariant(stores.auth.token, "JWT token not set properly");
      headers.set("Authorization", `Bearer ${stores.auth.token}`);
    }

    let response;
    try {
      response = await fetch(urlToFetch, {
        method,
        body,
        headers,
        redirect: "follow",
        credentials: "omit",
        cache: "no-cache",
      });
    } catch (err) {
      if (window.navigator.onLine) {
        throw new NetworkError("A network error occurred, try again?");
      } else {
        throw new OfflineError("No internet connection available");
      }
    }

    const success = response.status >= 200 && response.status < 300;

    if (options.download && success) {
      const blob = await response.blob();
      const fileName = (
        response.headers.get("content-disposition") || ""
      ).split("filename=")[1];

      download(blob, trim(fileName, '"'));
      return;
    } else if (success) {
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
      const parsed = await response.json();
      error.message = parsed.message || "";
      error.error = parsed.error;
      error.data = parsed.data;
    } catch (_err) {
      // we're trying to parse an error so JSON may not be valid
    }

    if (response.status === 400 && error.error === "editor_update_required") {
      window.location.reload(true);
      throw new UpdateRequiredError(error.message);
    }

    if (response.status === 403) {
      throw new AuthorizationError(error.message);
    }

    if (response.status === 404) {
      throw new NotFoundError(error.message);
    }

    throw new RequestError(error.message);
  };

  get = (path: string, data: ?Object, options?: Object) => {
    return this.fetch(path, "GET", data, options);
  };

  post = (path: string, data: ?Object, options?: Object) => {
    return this.fetch(path, "POST", data, options);
  };

  // Helpers
  constructQueryString = (data: { [key: string]: string }) => {
    return map(
      data,
      (v, k) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
    ).join("&");
  };
}

export default ApiClient;

// In case you don't want to always initiate, just import with `import { client } ...`
export const client = new ApiClient();
