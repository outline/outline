import retry from "fetch-retry";
import { chunk, trim } from "es-toolkit/compat";
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
  ClientClosedRequestError,
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
import { BatchableApiMethods, BatchMaxRequests, CSRF } from "@shared/constants";
import { getCSRFToken } from "./csrf";
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

/** A request captured during a batch, awaiting dispatch in a `/batch` call. */
interface BatchedRequest {
  method: string;
  body?: JSONObject;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

/** A single sub-response within a `/batch` response. */
interface BatchSubResponse {
  ok: boolean;
  status: number;
  data?: unknown;
  policies?: unknown;
  /** Structured error code, mirroring a top-level error response's `error`. */
  error?: string;
  message?: string;
}

/** Methods that may be collected into a single `/batch` request. */
const batchableMethods = new Set<string>(BatchableApiMethods);

class ApiClient {
  baseUrl: string;

  shareId?: string;

  /** Map of in-flight requests for deduplication, keyed by method + path + body. */
  // oxlint-disable-next-line no-explicit-any
  private inflightRequests = new Map<string, Promise<any>>();

  /** Requests collected while a batch is open, or undefined when not batching. */
  private batchQueue?: BatchedRequest[];

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
        const csrfToken = getCSRFToken();
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

    // The gateway or an upstream proxy failed before the app could respond; the
    // raw body is captured for diagnosis.
    if (response.status === 502) {
      const text = await response.text();

      // Gateways often respond with an empty body, or an HTML error page that is
      // too long to read as a title, so the endpoint leads the message.
      const detail = text.trim().slice(0, 200);
      const err = new BadGatewayError(
        detail
          ? `Bad gateway response from ${path}: ${detail}`
          : `Bad gateway response from ${path} with empty body`
      );

      Logger.error(
        "BadGatewayError",
        err,
        {
          url: urlToFetch,
          requestTime: Math.round(timeEnd - timeStart),
          responseText: text,
          responseHeaders: Object.fromEntries(response.headers.entries()),
        },
        // Grouped by endpoint, as the stack trace is identical for every 502.
        ["BadGatewayError", path]
      );
      throw err;
    }

    // Parse the structured error payload, if present.
    const error: ApiErrorResponse = {};
    try {
      const parsed: ApiErrorResponse = await response.json();
      error.message = parsed.message || "";
      error.error = parsed.error;
      error.data = parsed.data;
    } catch (_err) {
      // we're trying to parse an error so JSON may not be valid
    }

    const err = await this.toError(response.status, error.error, error.message);

    // Log failures that aren't mapped to a specific error type.
    if (err.constructor === RequestError) {
      Logger.error("Request failed", err, { ...error, url: urlToFetch });
    }

    // Still need to throw to trigger retry
    throw err;
  };

  /**
   * Maps a failed response's status and error code to the corresponding error
   * type, triggering the unauthorized handler for authentication failures.
   * Shared by top-level requests and batched sub-requests so both surface
   * identical errors and side effects.
   *
   * @param status The response status code.
   * @param code The structured error code, if any.
   * @param message The human-readable error message, if any.
   * @returns the error to throw or reject with.
   */
  private toError = async (
    status: number,
    code: string | undefined,
    message: string | undefined
  ): Promise<Error> => {
    if (status === 401) {
      if (!this.shareId) {
        await this.onUnauthorized?.("unauthorized");
      }
      return new AuthorizationError();
    }

    if (status === 400 && code === "editor_update_required") {
      window.location.reload();
      return new UpdateRequiredError(message);
    }

    if (status === 400) {
      return new BadRequestError(message);
    }

    if (status === 402) {
      return new PaymentRequiredError(message);
    }

    if (status === 403) {
      if (code === "user_suspended") {
        await this.onUnauthorized?.("user_suspended");
      }

      if (code === "csrf_error") {
        return new AuthorizationError(
          "CSRF token invalid, please try reloading."
        );
      }

      return new AuthorizationError(message);
    }

    if (status === 404) {
      return new NotFoundError(message);
    }

    if (status === 503) {
      return new ServiceUnavailableError(message);
    }

    if (status === 422) {
      return new UnprocessableEntityError(message);
    }

    if (status === 429) {
      return new RateLimitExceededError(
        `Too many requests, try again in a minute.`
      );
    }

    // The client, or an intermediate proxy, closed the connection before the
    // response was received – there is nothing actionable to report.
    if (status === 499) {
      return new ClientClosedRequestError(message);
    }

    return new RequestError(`Error ${status}`);
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
  ): Promise<T> => {
    const method = path.replace(/^\//, "");
    if (
      this.batchQueue &&
      !(data instanceof FormData) &&
      batchableMethods.has(method)
    ) {
      return new Promise<T>((resolve, reject) => {
        this.batchQueue!.push({
          method,
          body: data,
          resolve: resolve as (value: unknown) => void,
          reject,
        });
      });
    }
    return this.deduplicate<T>(path, "POST", data, options);
  };

  /**
   * Collects every batchable POST request issued during the synchronous
   * execution of `fn` and dispatches them as a single `/batch` request once
   * `fn` returns. Non-batchable requests, and requests made after `fn` returns,
   * are sent normally; nested calls join the enclosing batch.
   *
   * @param fn A function that issues the requests to be batched.
   * @returns whatever `fn` returns.
   */
  batch = <T>(fn: () => T): T => {
    if (this.batchQueue) {
      return fn();
    }

    const queue: BatchedRequest[] = [];
    this.batchQueue = queue;
    try {
      return fn();
    } finally {
      this.batchQueue = undefined;
      void this.flushBatch(queue);
    }
  };

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

  /**
   * Dispatches the requests collected during a batch, splitting them into
   * serial `/batch` calls that respect the server's per-batch limit, and
   * settles each caller's promise with its corresponding sub-response — shaped
   * like a standard API envelope so callers need no special handling.
   *
   * @param queue The requests collected during a batch.
   */
  private flushBatch = async (queue: BatchedRequest[]): Promise<void> => {
    for (const group of chunk(queue, BatchMaxRequests)) {
      try {
        const res = await this.fetch<{ data: BatchSubResponse[] }>(
          "/batch",
          "POST",
          { requests: group.map(({ method, body }) => ({ method, body })) }
        );
        for (let index = 0; index < group.length; index++) {
          const request = group[index];
          const result = res?.data?.[index];
          if (result?.ok) {
            request.resolve({ data: result.data, policies: result.policies });
          } else {
            request.reject(
              await this.toError(
                result?.status ?? 500,
                result?.error,
                result?.message
              )
            );
          }
        }
      } catch (err) {
        group.forEach((request) => request.reject(err));
      }
    }
  };
}

/** Shared API client instance configured against the default base URL. */
export const client = new ApiClient();
