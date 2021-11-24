import retry from "fetch-retry";
import invariant from "invariant";
import { map, trim } from "lodash";
import { getCookie } from "tiny-cookie";
import stores from "~/stores";
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
// authorization cookie set by a Cloudflare Access proxy
const CF_AUTHORIZATION = getCookie("CF_Authorization");

// if the cookie is set, we must pass it with all ApiClient requests
const CREDENTIALS = CF_AUTHORIZATION ? "same-origin" : "omit";
const fetchWithRetry = retry(fetch);

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
    data: (Record<string, any> | undefined) | FormData,
    options: Record<string, any> = {}
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

    const headerOptions: any = {
      Accept: "application/json",
      "cache-control": "no-cache",
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'EDITOR_VERSION'.
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
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'string | Record<string, any> | undefined' is... Remove this comment to see the full error message
        body,
        headers,
        redirect: "follow",
        credentials: CREDENTIALS,
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
    const error = {};
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'statusCode' does not exist on type '{}'.
    error.statusCode = response.status;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'response' does not exist on type '{}'.
    error.response = response;

    try {
      const parsed = await response.json();
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'message' does not exist on type '{}'.
      error.message = parsed.message || "";
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'error' does not exist on type '{}'.
      error.error = parsed.error;
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'data' does not exist on type '{}'.
      error.data = parsed.data;
    } catch (_err) {
      // we're trying to parse an error so JSON may not be valid
    }

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'error' does not exist on type '{}'.
    if (response.status === 400 && error.error === "editor_update_required") {
      window.location.reload();
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'message' does not exist on type '{}'.
      throw new UpdateRequiredError(error.message);
    }

    if (response.status === 400) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'message' does not exist on type '{}'.
      throw new BadRequestError(error.message);
    }

    if (response.status === 403) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'error' does not exist on type '{}'.
      if (error.error === "user_suspended") {
        stores.auth.logout();
        return;
      }

      // @ts-expect-error ts-migrate(2339) FIXME: Property 'message' does not exist on type '{}'.
      throw new AuthorizationError(error.message);
    }

    if (response.status === 404) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'message' does not exist on type '{}'.
      throw new NotFoundError(error.message);
    }

    if (response.status === 503) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'message' does not exist on type '{}'.
      throw new ServiceUnavailableError(error.message);
    }

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'message' does not exist on type '{}'.
    throw new RequestError(error.message);
  };

  get = (
    path: string,
    data: Record<string, any> | undefined,
    options?: Record<string, any>
  ) => {
    return this.fetch(path, "GET", data, options);
  };

  post = (
    path: string,
    data?: Record<string, any> | undefined,
    options?: Record<string, any>
  ) => {
    return this.fetch(path, "POST", data, options);
  };

  // Helpers
  constructQueryString = (data: Record<string, any>) => {
    return map(
      data,
      (v, k) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
    ).join("&");
  };
}

export default ApiClient; // In case you don't want to always initiate, just import with `import { client } ...`

export const client = new ApiClient();
