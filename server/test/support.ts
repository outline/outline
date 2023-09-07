import http from "http";
import { AddressInfo } from "net";
import Koa from "koa";
// eslint-disable-next-line no-restricted-imports
import nodeFetch from "node-fetch";
import { WhereOptions } from "sequelize";
import sharedEnv from "@shared/env";
import env from "@server/env";
import { Event, Team } from "@server/models";
import onerror from "@server/onerror";
import webService from "@server/services/web";
import { sequelize } from "@server/storage/database";

class TestServer {
  private server: http.Server;
  private listener?: Promise<void> | null;

  constructor(app: Koa) {
    this.server = http.createServer(app.callback() as any);
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

  fetch(path: string, opts: any) {
    return this.listen().then(() => {
      const url = `${this.address}${path}`;
      const options = Object.assign({ headers: {} }, opts);
      const contentType =
        options.headers["Content-Type"] ?? options.headers["content-type"];
      // automatic JSON encoding
      if (!contentType && typeof options.body === "object") {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(options.body);
      }

      return nodeFetch(url, options);
    });
  }

  close() {
    this.listener = null;
    return new Promise<void>((resolve, reject) => {
      this.server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  delete(path: string, options: any) {
    return this.fetch(path, { ...options, method: "DELETE" });
  }

  get(path: string, options: any) {
    return this.fetch(path, { ...options, method: "GET" });
  }

  head(path: string, options: any) {
    return this.fetch(path, { ...options, method: "HEAD" });
  }

  options(path: string, options: any) {
    return this.fetch(path, { ...options, method: "OPTIONS" });
  }

  patch(path: string, options: any) {
    return this.fetch(path, { ...options, method: "PATCH" });
  }

  post(path: string, options: any) {
    return this.fetch(path, { ...options, method: "POST" });
  }

  put(path: string, options: any) {
    return this.fetch(path, { ...options, method: "PUT" });
  }
}

export function getTestServer() {
  const app = webService();
  onerror(app);
  const server = new TestServer(app);

  const disconnect = async () => {
    await sequelize.close();
    return server.close();
  };

  afterAll(disconnect);

  return server;
}

/**
 * Set the environment to be cloud hosted.
 */
export function setCloudHosted() {
  return (env.URL = sharedEnv.URL = "https://app.outline.dev");
}

/**
 * Set the environment to be self hosted.
 */
export async function setSelfHosted() {
  env.URL = sharedEnv.URL = "https://wiki.example.com";

  // Self hosted deployments only have one team, to ensure behavior is correct
  // we need to delete all teams before running tests
  return Team.destroy({
    truncate: true,
  });
}

export function findLatestEvent(where: WhereOptions<Event> = {}) {
  return Event.findOne({
    where,
    order: [["createdAt", "DESC"]],
  });
}
