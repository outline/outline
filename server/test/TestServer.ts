import http from "node:http";
import type { AddressInfo } from "node:net";
import type Koa from "koa";
// oxlint-disable-next-line no-restricted-imports
import nodeFetch from "node-fetch";
// oxlint-disable-next-line no-restricted-imports
import type { RequestInit } from "node-fetch";

type TestRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: Record<string, string>;
};

interface Authable {
  getSessionToken(): string;
}

const tokenCache = new WeakMap<Authable, string>();

function getCachedSessionToken(user: Authable): string {
  let token = tokenCache.get(user);
  if (!token) {
    token = user.getSessionToken();
    tokenCache.set(user, token);
  }
  return token;
}

function normalizeArgs(
  userOrOpts?: Authable | TestRequestOptions,
  maybeOpts?: TestRequestOptions
): { user?: Authable; opts: TestRequestOptions } {
  if (
    userOrOpts &&
    typeof (userOrOpts as Authable).getSessionToken === "function"
  ) {
    return { user: userOrOpts as Authable, opts: maybeOpts ?? {} };
  }
  return { opts: (userOrOpts as TestRequestOptions) ?? {} };
}

class TestServer {
  private server: http.Server;
  private listener?: Promise<void> | null;

  constructor(app: Koa) {
    this.server = http.createServer(app.callback() as http.RequestListener);
  }

  get address(): string {
    const { port } = this.server.address() as AddressInfo;
    return `http://localhost:${port}`;
  }

  listen() {
    if (!this.listener) {
      this.listener = new Promise((resolve, reject) => {
        this.server
          .listen(0, () => resolve())
          .on("error", (err) => reject(err));
      });
    }

    return this.listener;
  }

  fetch(path: string, opts?: TestRequestOptions): ReturnType<typeof nodeFetch>;
  fetch(
    path: string,
    user: Authable,
    opts?: TestRequestOptions
  ): ReturnType<typeof nodeFetch>;
  fetch(
    path: string,
    userOrOpts?: Authable | TestRequestOptions,
    maybeOpts?: TestRequestOptions
  ) {
    const { user, opts } = normalizeArgs(userOrOpts, maybeOpts);
    return this.listen().then(() => {
      const url = `${this.address}${path}`;
      const headers: Record<string, string> = { ...opts.headers };
      if (user && !headers.Authorization && !headers.authorization) {
        headers.Authorization = `Bearer ${getCachedSessionToken(user)}`;
      }
      let body = opts.body;
      const contentType = headers["Content-Type"] ?? headers["content-type"];
      // automatic JSON encoding
      if (!contentType && typeof body === "object" && body !== null) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(body);
      }

      return nodeFetch(url, {
        ...opts,
        headers,
        body: body as string | undefined,
      });
    });
  }

  close() {
    this.listener = null;
    this.server.closeAllConnections();
    this.server.close();
  }

  delete(path: string, opts?: TestRequestOptions): ReturnType<typeof nodeFetch>;
  delete(
    path: string,
    user: Authable,
    opts?: TestRequestOptions
  ): ReturnType<typeof nodeFetch>;
  delete(
    path: string,
    userOrOpts?: Authable | TestRequestOptions,
    maybeOpts?: TestRequestOptions
  ) {
    const { user, opts } = normalizeArgs(userOrOpts, maybeOpts);
    return user
      ? this.fetch(path, user, { ...opts, method: "DELETE" })
      : this.fetch(path, { ...opts, method: "DELETE" });
  }

  get(path: string, opts?: TestRequestOptions): ReturnType<typeof nodeFetch>;
  get(
    path: string,
    user: Authable,
    opts?: TestRequestOptions
  ): ReturnType<typeof nodeFetch>;
  get(
    path: string,
    userOrOpts?: Authable | TestRequestOptions,
    maybeOpts?: TestRequestOptions
  ) {
    const { user, opts } = normalizeArgs(userOrOpts, maybeOpts);
    return user
      ? this.fetch(path, user, { ...opts, method: "GET" })
      : this.fetch(path, { ...opts, method: "GET" });
  }

  head(path: string, opts?: TestRequestOptions): ReturnType<typeof nodeFetch>;
  head(
    path: string,
    user: Authable,
    opts?: TestRequestOptions
  ): ReturnType<typeof nodeFetch>;
  head(
    path: string,
    userOrOpts?: Authable | TestRequestOptions,
    maybeOpts?: TestRequestOptions
  ) {
    const { user, opts } = normalizeArgs(userOrOpts, maybeOpts);
    return user
      ? this.fetch(path, user, { ...opts, method: "HEAD" })
      : this.fetch(path, { ...opts, method: "HEAD" });
  }

  options(
    path: string,
    opts?: TestRequestOptions
  ): ReturnType<typeof nodeFetch>;
  options(
    path: string,
    user: Authable,
    opts?: TestRequestOptions
  ): ReturnType<typeof nodeFetch>;
  options(
    path: string,
    userOrOpts?: Authable | TestRequestOptions,
    maybeOpts?: TestRequestOptions
  ) {
    const { user, opts } = normalizeArgs(userOrOpts, maybeOpts);
    return user
      ? this.fetch(path, user, { ...opts, method: "OPTIONS" })
      : this.fetch(path, { ...opts, method: "OPTIONS" });
  }

  patch(path: string, opts?: TestRequestOptions): ReturnType<typeof nodeFetch>;
  patch(
    path: string,
    user: Authable,
    opts?: TestRequestOptions
  ): ReturnType<typeof nodeFetch>;
  patch(
    path: string,
    userOrOpts?: Authable | TestRequestOptions,
    maybeOpts?: TestRequestOptions
  ) {
    const { user, opts } = normalizeArgs(userOrOpts, maybeOpts);
    return user
      ? this.fetch(path, user, { ...opts, method: "PATCH" })
      : this.fetch(path, { ...opts, method: "PATCH" });
  }

  post(path: string, opts?: TestRequestOptions): ReturnType<typeof nodeFetch>;
  post(
    path: string,
    user: Authable,
    opts?: TestRequestOptions
  ): ReturnType<typeof nodeFetch>;
  post(
    path: string,
    userOrOpts?: Authable | TestRequestOptions,
    maybeOpts?: TestRequestOptions
  ) {
    const { user, opts } = normalizeArgs(userOrOpts, maybeOpts);
    return user
      ? this.fetch(path, user, { ...opts, method: "POST" })
      : this.fetch(path, { ...opts, method: "POST" });
  }

  put(path: string, opts?: TestRequestOptions): ReturnType<typeof nodeFetch>;
  put(
    path: string,
    user: Authable,
    opts?: TestRequestOptions
  ): ReturnType<typeof nodeFetch>;
  put(
    path: string,
    userOrOpts?: Authable | TestRequestOptions,
    maybeOpts?: TestRequestOptions
  ) {
    const { user, opts } = normalizeArgs(userOrOpts, maybeOpts);
    return user
      ? this.fetch(path, user, { ...opts, method: "PUT" })
      : this.fetch(path, { ...opts, method: "PUT" });
  }
}

export default TestServer;
