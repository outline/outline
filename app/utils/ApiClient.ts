import retry from "fetch-retry";
import invariant from "invariant";
import { trim } from "lodash";
import queryString from "query-string";
import EDITOR_VERSION from "@shared/editor/version";
import stores from "~/stores";
import isCloudHosted from "~/utils/isCloudHosted";
import download from "./download";
import {
  AuthorizationError,
  BadRequestError,
  NetworkError,
  NotFoundError,
  OfflineError,
  RequestError,
  ServiceUnavailableError,
  UpdateRequiredError,
} from "./errors";

type Options = {
  baseUrl?: string;
};

type FetchOptions = {
  download?: boolean;
};

const fetchWithRetry = retry(fetch);

class ApiClient {
  baseUrl: string;

  constructor(options: Options = {}) {
    this.baseUrl = options.baseUrl || "/api";
  }

  fetch = async (
    path: string,
    method: string,
    data: Record<string, any> | FormData | undefined,
    options: FetchOptions = {}
  ) => {
    let body: string | FormData | undefined;
    let modifiedPath;
    let urlToFetch;
    let isJson;

    if (method === "GET") {
      if (data) {
        modifiedPath = `${path}?${data && queryString.stringify(data)}`;
      } else {
        modifiedPath = path;
      }
    } else if (method === "POST" || method === "PUT") {
      if (data instanceof FormData || typeof data === "string") {
        body = data;
      }

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

    const headerOptions: Record<string, string> = {
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
      response = await fetchWithRetry(urlToFetch, {
        method,
        body,
        headers,
        redirect: "follow",
        // For the hosted deployment we omit cookies on API requests as they are
        // not needed for authentication this offers a performance increase.
        // For self-hosted we include them to support a wide variety of
        // authenticated proxies, e.g. Pomerium, Cloudflare Access etc.
        credentials: isCloudHosted ? "omit" : "same-origin",
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
    } else if (success && response.status === 204) {
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
    const error: {
      statusCode?: number;
      response?: Response;
      message?: string;
      error?: string;
      data?: Record<string, any>;
    } = {};

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
      window.location.reload();
      throw new UpdateRequiredError(error.message);
    }

    if (response.status === 400) {
      throw new BadRequestError(error.message);
    }

    if (response.status === 403) {
      if (error.error === "user_suspended") {
        stores.auth.logout();
        return;
      }

      throw new AuthorizationError(error.message);
    }

    if (response.status === 404) {
      throw new NotFoundError(error.message);
    }

    if (response.status === 503) {
      throw new ServiceUnavailableError(error.message);
    }

    throw new RequestError(`Error ${error.statusCode}: ${error.message}`);
  };

  get = (
    path: string,
    data: Record<string, any> | undefined,
    options?: FetchOptions
  ) => {
    return this.fetch(path, "GET", data, options);
  };

  post = (
    path: string,
    data?: Record<string, any> | undefined,
    options?: FetchOptions
  ) => {
    return this.fetch(path, "POST", data, options);
  };
}

export const client = new ApiClient();
