import retry from "fetch-retry";
import { trim } from "es-toolkit/compat";
import queryString from "query-string";
import EDITOR_VERSION from "@shared/editor/version";
import type { JSONObject } from "@shared/types";
import { Scope } from "@shared/types";
import { version } from "../../package.json";
import env from "~/env";
import Logger from "./Logger";
import { download } from "./download";
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
  UnprocessableEntityError,
  UpdateRequiredError,
} from "./errors";
import { getCookie } from "tiny-cookie";
import { CSRF } from "@shared/constants";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";

type Options = {
  baseUrl?: string;
};

/** An HTTP method supported by the API client. */
type Method = "GET" | "POST" | "PUT";

/** Shape of an error payload returned by the API. */
interface ApiErrorResponse {
  message?: string;
  error?: string;
  data?: Record<string, unknown>;
}

/** Reason the server rejected a request as unauthenticated. */
export type UnauthorizedReason = "unauthorized" | "user_suspended";

/** Handler invoked when a request is rejected as unauthenticated. */
type UnauthorizedHandler = (reason: UnauthorizedReason) => void | Promise<void>;

interface FetchOptions {
  download?: boolean;
  retry?: boolean;
  credentials?: "omit" | "same-origin" | "include";
  headers?: Record<string, string>;
  baseUrl?: string;
}

class ApiClient {
  baseUrl: string;

  shareId?: string;

  /** Map of in-flight requests for deduplication, keyed by method + path + body. */
  // oxlint-disable-next-line no-explicit-any
  private inflightRequests = new Map<string, Promise<any>>();

  private onUnauthorized?: UnauthorizedHandler;

  constructor(options: Options = {}) {
    this.baseUrl = options.baseUrl || "/api";
  }

  /**
   * Sets the share identifier appended to subsequent requests, used to
   * authenticate access to publicly shared documents.
   *
   * @param shareId the share identifier, or undefined to clear it.
   */
  setShareId = (shareId: string | undefined) => {
    this.shareId = shareId;
  };

  /**
   * Registers a handler invoked when a request is rejected as unauthenticated
   * (a 401, or a 403 indicating the user was suspended). Used to keep
   * session/logout policy out of the transport layer.
   *
   * @param handler the handler to invoke.
   */
  setUnauthorizedHandler = (handler: UnauthorizedHandler) => {
    this.onUnauthorized = handler;
  };

  /**
   * Performs an HTTP request against the API, handling serialization, headers,
   * CSRF, retries, and error mapping.
   *
   * @param path the request path, relative to the base URL or an absolute URL.
   * @param method the HTTP method to use.
   * @param data the request payload, sent as a query string for GET requests
   * and as a JSON or multipart body otherwise.
   * @param options additional request options.
   * @returns the parsed JSON response, or undefined for downloads and empty responses.
   * @throws {RequestError} if the response status indicates failure.
   */
  // oxlint-disable-next-line no-explicit-any
  fetch = async <T = any>(
    path: string,
    method: Method,
    data: JSONObject | FormData | undefined,
    options: FetchOptions = {}
  ): Promise<T> => {
    let body: string | FormData | undefined;
    let modifiedPath: string | undefined;
    let urlToFetch: string;
    let isJson = false;

    if (this.shareId) {
      if (data instanceof FormData) {
        data.append("shareId", this.shareId);
      } else {
        data = {
          ...data,
          shareId: this.shareId,
        };
      }
    }

    if (method === "GET") {
      if (data) {
        modifiedPath = `${path}?${queryString.stringify(data)}`;
      } else {
        modifiedPath = path;
      }
    } else if (method === "POST" || method === "PUT") {
      if (data instanceof FormData || typeof data === "string") {
        body = data;
      } else {
        isJson = true;

        // Only stringify data if its a normal object and
        // not if it's [object FormData], in addition to
        // toggling Content-Type to application/json
        if (
          typeof data === "object" &&
          Object.prototype.toString.call(data) === "[object Object]"
        ) {
          body = JSON.stringify(data);
        }
      }
    }

    if (path.match(/^http/)) {
      urlToFetch = modifiedPath || path;
    } else {
      urlToFetch = (options.baseUrl ?? this.baseUrl) + (modifiedPath || path);
    }

    const headerOptions: Record<string, string> = {
      Accept: "application/json",
      "cache-control": "no-cache",
      "x-editor-version": EDITOR_VERSION,
      "x-api-version": "4",
      "x-client-version": env.VERSION ? `${version}-${env.VERSION}` : version,
      pragma: "no-cache",
      ...options?.headers,
    };

    // Mutating requests require a CSRF token, unless exempt server-side.
    const isModifyingRequest = method === "POST" || method === "PUT";
    const canAccessWithReadOnly = AuthenticationHelper.canAccess(path, [
      Scope.Read,
    ]);
    const requiresCsrfToken = isModifyingRequest && !canAccessWithReadOnly;

    // for multipart forms or other non JSON requests fetch
    // populates the Content-Type without needing to explicitly
    // set it.
    if (isJson) {
      headerOptions["Content-Type"] = "application/json";
    }

    const headers = new Headers(headerOptions);

    // The token is read before each attempt so that retries reflect any
    // rotation of the cookie since the request was prepared.
    const fetchWithFreshCsrfToken: typeof fetch = (input, init) => {
      if (requiresCsrfToken) {
        const csrfToken = getCookie(CSRF.cookieName);
        if (csrfToken) {
          headers.set(CSRF.headerName, csrfToken);
        }
      }
      return fetch(input, init);
    };

    const timeStart = window.performance.now();
    let response;

    try {
      response = await (
        options?.retry === false
          ? fetchWithFreshCsrfToken
          : retry(fetchWithFreshCsrfToken)
      )(urlToFetch, {
        method,
        body,
        headers,
        redirect: "follow",
        credentials: "same-origin",
        cache: "no-cache",
      });
    } catch (_err) {
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

    // Handle 401, notify session owner to log out
    if (response.status === 401) {
      if (!this.shareId) {
        await this.onUnauthorized?.("unauthorized");
      }
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
    const error: ApiErrorResponse = {};

    try {
      const parsed: ApiErrorResponse = await response.json();
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
        await this.onUnauthorized?.("user_suspended");
      }

      if (error.error === "csrf_error") {
        throw new AuthorizationError(
          "CSRF token invalid, please try reloading."
        );
      }

      throw new AuthorizationError(error.message);
    }

    if (response.status === 404) {
      throw new NotFoundError(error.message);
    }

    if (response.status === 503) {
      throw new ServiceUnavailableError(error.message);
    }

    if (response.status === 422) {
      throw new UnprocessableEntityError(error.message);
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

  /**
   * Performs a GET request against the API.
   *
   * @param path the request path, relative to the base URL or an absolute URL.
   * @param data the data serialized into the query string.
   * @param options additional request options.
   * @returns the parsed JSON response.
   */
  // oxlint-disable-next-line no-explicit-any
  get = <T = any>(
    path: string,
    data: JSONObject | undefined,
    options?: FetchOptions
  ) => this.fetch<T>(path, "GET", data, options);

  /**
   * Performs a POST request against the API. Identical in-flight requests are
   * deduplicated and share a single response, except for multipart uploads.
   *
   * @param path the request path, relative to the base URL or an absolute URL.
   * @param data the request payload, sent as a JSON or multipart body.
   * @param options additional request options.
   * @returns the parsed JSON response.
   */
  // oxlint-disable-next-line no-explicit-any
  post = <T = any>(
    path: string,
    data?: JSONObject | FormData,
    options?: FetchOptions
  ): Promise<T> => this.deduplicate<T>(path, "POST", data, options);

  /**
   * Performs a PUT request against the API. Identical in-flight requests are
   * deduplicated and share a single response, except for multipart uploads.
   *
   * @param path the request path, relative to the base URL or an absolute URL.
   * @param data the request payload, sent as a JSON or multipart body.
   * @param options additional request options.
   * @returns the parsed JSON response.
   */
  // oxlint-disable-next-line no-explicit-any
  put = <T = any>(
    path: string,
    data?: JSONObject | FormData,
    options?: FetchOptions
  ): Promise<T> => this.deduplicate<T>(path, "PUT", data, options);

  /**
   * Sends a request, deduplicating identical in-flight requests so concurrent
   * callers share a single response. Multipart uploads are never deduplicated.
   *
   * @param path the request path, relative to the base URL or an absolute URL.
   * @param method the HTTP method to use.
   * @param data the request payload.
   * @param options additional request options.
   * @returns the parsed JSON response.
   */
  // oxlint-disable-next-line no-explicit-any
  private deduplicate = <T = any>(
    path: string,
    method: Method,
    data?: JSONObject | FormData,
    options?: FetchOptions
  ): Promise<T> => {
    if (data instanceof FormData) {
      return this.fetch<T>(path, method, data, options);
    }

    const key = `${method}:${path}:${JSON.stringify(data)}:${JSON.stringify(
      options
    )}`;
    const inflight = this.inflightRequests.get(key);
    if (inflight) {
      return inflight;
    }

    const promise = this.fetch<T>(path, method, data, options).finally(() => {
      this.inflightRequests.delete(key);
    });
    this.inflightRequests.set(key, promise);
    return promise;
  };
}

/** Shared API client instance configured against the default base URL. */
export const client = new ApiClient();
