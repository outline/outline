import retry from "fetch-retry";
import trim from "lodash/trim";
import queryString from "query-string";
import EDITOR_VERSION from "@shared/editor/version";
import { JSONObject } from "@shared/types";
import stores from "~/stores";
import Logger from "./Logger";
import download from "./download";
import {
  AuthorizationError,
  BadGatewayError,
  BadRequestError,
  NetworkError,
  NotFoundError,
  OfflineError,
  PaymentRequiredError,
  RateLimitExceededError,
  RequestError,
  ServiceUnavailableError,
  UpdateRequiredError,
} from "./errors";

type Options = {
  baseUrl?: string;
};

interface FetchOptions {
  download?: boolean;
  retry?: boolean;
  credentials?: "omit" | "same-origin" | "include";
  headers?: Record<string, string>;
}

const fetchWithRetry = retry(fetch);

class ApiClient {
  baseUrl: string;

  shareId?: string;

  constructor(options: Options = {}) {
    this.baseUrl = options.baseUrl || "/api";
  }

  setShareId = (shareId: string | undefined) => {
    this.shareId = shareId;
  };

  fetch = async <T = any>(
    path: string,
    method: string,
    data: JSONObject | FormData | undefined,
    options: FetchOptions = {}
  ): Promise<T> => {
    let body: string | FormData | undefined;
    let modifiedPath;
    let urlToFetch;
    let isJson;

    if (this.shareId) {
      // add to data
      data = {
        ...(data || {}),
        shareId: this.shareId,
      };
    }

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
      "x-api-version": "3",
      pragma: "no-cache",
      ...options?.headers,
    };

    // for multipart forms or other non JSON requests fetch
    // populates the Content-Type without needing to explicitly
    // set it.
    if (isJson) {
      headerOptions["Content-Type"] = "application/json";
    }

    const headers = new Headers(headerOptions);
    const timeStart = window.performance.now();
    let response;

    try {
      response = await (options?.retry === false ? fetch : fetchWithRetry)(
        urlToFetch,
        {
          method,
          body,
          headers,
          redirect: "follow",
          credentials: "same-origin",
          cache: "no-cache",
        }
      );
    } catch (err) {
      if (window.navigator.onLine) {
        throw new NetworkError("A network error occurred, try again?");
      } else {
        throw new OfflineError("No internet connection available");
      }
    }

    const timeEnd = window.performance.now();
    const success = response.status >= 200 && response.status < 300;

    if (options.download && success) {
      const blob = await response.blob();
      const fileName = (
        response.headers.get("content-disposition") || ""
      ).split("filename=")[1];
      download(blob, trim(fileName, '"'));
      return undefined as T;
    } else if (success && response.status === 204) {
      return undefined as T;
    } else if (success) {
      return response.json();
    }

    // Handle 401, log out user
    if (response.status === 401) {
      await stores.auth.logout(true, false);
      throw new AuthorizationError();
    }

    if (response.status === 502) {
      const text = await response.text();
      const err = new BadGatewayError(text);

      Logger.error("BadGatewayError", err, {
        url: urlToFetch,
        requestTime: Math.round(timeEnd - timeStart),
        responseText: text,
        responseHeaders: Object.fromEntries(response.headers.entries()),
      });
      throw err;
    }

    // Handle failed responses
    const error: {
      message?: string;
      error?: string;
      data?: Record<string, any>;
    } = {};

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

    if (response.status === 402) {
      throw new PaymentRequiredError(error.message);
    }

    if (response.status === 403) {
      if (error.error === "user_suspended") {
        await stores.auth.logout(false, false);
      }

      throw new AuthorizationError(error.message);
    }

    if (response.status === 404) {
      throw new NotFoundError(error.message);
    }

    if (response.status === 503) {
      throw new ServiceUnavailableError(error.message);
    }

    if (response.status === 429) {
      throw new RateLimitExceededError(
        `Too many requests, try again in a minute.`
      );
    }

    const err = new RequestError(`Error ${response.status}`);
    Logger.error("Request failed", err, {
      ...error,
      url: urlToFetch,
    });

    // Still need to throw to trigger retry
    throw err;
  };

  get = <T = any>(
    path: string,
    data: JSONObject | undefined,
    options?: FetchOptions
  ) => this.fetch<T>(path, "GET", data, options);

  post = <T = any>(
    path: string,
    data?: JSONObject | FormData | undefined,
    options?: FetchOptions
  ) => this.fetch<T>(path, "POST", data, options);
}

export const client = new ApiClient();
