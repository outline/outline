import http from "http";
// eslint-disable-next-line no-restricted-imports
import nodeFetch from "node-fetch";
import { WhereOptions } from "sequelize";
import sharedEnv from "@shared/env";
import env from "@server/env";
import { Event, Team } from "@server/models";
import onerror from "@server/onerror";
import webService from "@server/services/web";
import { sequelize } from "@server/storage/database";

function TestServer(app: any) {
  // allow custom promise
  if (!TestServer.Promise) {
    throw new Error(
      "native promise missing, set TestServer.Promise to your favorite alternative"
    );
  }

  this.Promise = TestServer.Promise;
  this.server = http.createServer(app);

  ["delete", "get", "head", "options", "patch", "post", "put"].forEach(
    (method) => {
      this[method] = (path: any, options: any) =>
        this.fetch(
          path,
          Object.assign({}, options, { method: method.toUpperCase() })
        );
    }
  );

  Object.defineProperty(this, "address", {
    get: function address() {
      const port = this.server.address().port;
      return `http://localhost:${port}`;
    },
  });
}

TestServer.prototype.listen = function listen() {
  if (!this.listener) {
    this.listener = new this.Promise((resolve: any, reject: any) => {
      this.server
        .listen(0, () => resolve())
        .on("error", (err: any) => {
          reject(err);
        });
    });
  }

  return this.listener;
};

TestServer.prototype.close = function close() {
  this.listener = null;

  return new this.Promise((resolve: any, reject: any) => {
    this.server.close((err: any) => (err ? reject(err) : resolve()));
  });
};

TestServer.prototype.fetch = function fetch(path: any, opts: any) {
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
};

// expose Promise
TestServer.Promise = global.Promise;

export function getTestServer() {
  const app = webService();
  onerror(app);
  const server = new (TestServer as any)(app.callback());

  server.disconnect = async () => {
    await sequelize.close();
    server.close();
  };

  afterAll(server.disconnect);
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
