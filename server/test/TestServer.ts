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

  fetch(path: string, opts: TestRequestOptions) {
    return this.listen().then(() => {
      const url = `${this.address}${path}`;
      const headers: Record<string, string> = { ...opts.headers };
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

  delete(path: string, options?: TestRequestOptions) {
    return this.fetch(path, { ...options, method: "DELETE" });
  }

  get(path: string, options?: TestRequestOptions) {
    return this.fetch(path, { ...options, method: "GET" });
  }

  head(path: string, options?: TestRequestOptions) {
    return this.fetch(path, { ...options, method: "HEAD" });
  }

  options(path: string, options?: TestRequestOptions) {
    return this.fetch(path, { ...options, method: "OPTIONS" });
  }

  patch(path: string, options?: TestRequestOptions) {
    return this.fetch(path, { ...options, method: "PATCH" });
  }

  post(path: string, options?: TestRequestOptions) {
    return this.fetch(path, { ...options, method: "POST" });
  }

  put(path: string, options?: TestRequestOptions) {
    return this.fetch(path, { ...options, method: "PUT" });
  }
}

export default TestServer;
