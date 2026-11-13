import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import type { Transaction } from "sequelize";
import { ZipFile } from "yazl";
import { afterEach, beforeEach, vi } from "vitest";
import sharedEnv from "@shared/env";
import { createContext } from "@server/context";
import env from "@server/env";
import type { User } from "@server/models";
import onerror from "@server/onerror";
import { BaseTask } from "@server/queues/tasks/base/BaseTask";
import webService from "@server/services/web";
import { sequelize } from "@server/storage/database";
import type { APIContext, AppContext } from "@server/types";
import { AuthenticationType } from "@server/types";
import ZipHelper from "@server/utils/ZipHelper";
import TestServer from "./TestServer";

export function getTestServer() {
  const app = webService();
  onerror(app);
  const server = new TestServer(app);

  afterAll(() => server.close());

  return server;
}

/**
 * Start a local HTTP proxy for the current test file that records the
 * requests it receives. CONNECT requests are refused with a 403 response.
 *
 * @param handler optional handler for proxied HTTP requests, by default the
 * proxy responds with "proxied".
 * @returns the proxy URL, and the requests and connections since the last test.
 */
export function getTestProxy(
  handler: http.RequestListener = (_req, res) => res.end("proxied")
) {
  const proxy: TestProxy = { url: "", requests: [], connections: 0 };
  const record = (req: http.IncomingMessage) =>
    proxy.requests.push({
      method: req.method,
      url: req.url,
      auth: req.headers["proxy-authorization"],
    });

  const server = http.createServer((req, res) => {
    record(req);
    handler(req, res);
  });
  server.on("connection", () => {
    proxy.connections++;
  });
  server.on("connect", (req, socket) => {
    record(req);
    socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
  });

  beforeAll(async () => {
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const address = server.address();
    const port = address && typeof address === "object" ? address.port : 0;
    proxy.url = `http://127.0.0.1:${port}`;
  });

  beforeEach(() => {
    proxy.requests = [];
    proxy.connections = 0;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  return proxy;
}

interface TestProxy {
  url: string;
  requests: { method?: string; url?: string; auth?: string }[];
  connections: number;
}

/**
 * Set the environment to be self hosted.
 */
export function setSelfHosted() {
  env.URL = sharedEnv.URL = `https://${faker.internet.domainName()}`;
}

/**
 * Set the environment to be cloud hosted.
 */
export function setCloudHosted() {
  env.URL = sharedEnv.URL = "https://app.outline.dev";
}

/**
 * Mock scheduling for all task subclasses in the current test file.
 *
 * @returns the schedule mock for assertions.
 */
export function mockTaskSchedule() {
  const schedule = vi.fn<BaseTask<object>["schedule"]>();

  beforeEach(() => {
    schedule.mockReset();
    vi.spyOn(BaseTask.prototype, "schedule").mockImplementation(schedule);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  return schedule;
}

export function withAPIContext<T>(
  user: User,
  fn: (ctx: APIContext) => T
): Promise<T> {
  return sequelize.transaction(async (transaction: Transaction) => {
    const state = {
      auth: {
        user,
        type: AuthenticationType.APP,
        token: user.getSessionToken(),
      },
      transaction,
    };
    return fn({
      ...createContext({ user, transaction }),
      state,
      request: {
        ip: faker.internet.ip(),
      },
    } as APIContext);
  });
}

/**
 * Read a zip archive returned from an API endpoint into memory.
 *
 * @param res The response to read the archive from.
 * @returns a map of entry filename to the entry contents as a string.
 */
export async function readZipResponse(
  res: Awaited<ReturnType<TestServer["post"]>>
): Promise<Record<string, string>> {
  const filePath = path.join(os.tmpdir(), `test-${randomUUID()}.zip`);
  await fs.writeFile(filePath, Buffer.from(await res.arrayBuffer()));

  try {
    const entries: Record<string, string> = {};
    await ZipHelper.walk(filePath, async (entry) => {
      entries[entry.fileName] = (
        await entry.readBuffer(1024 * 1024)
      ).toString();
    });
    return entries;
  } finally {
    await fs.rm(filePath, { force: true });
  }
}

/**
 * Build a zip archive in memory from a map of entry path to contents. Useful
 * for describing an archive's structure inline in a test rather than carrying
 * an opaque binary fixture.
 *
 * @param files Map of path within the archive to its contents.
 * @returns The zip archive as a Buffer.
 */
export function buildZip(
  files: Record<string, string | Buffer>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const zip = new ZipFile();
    const chunks: Buffer[] = [];

    zip.outputStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    zip.outputStream.on("error", reject);

    for (const [name, contents] of Object.entries(files)) {
      zip.addBuffer(
        Buffer.isBuffer(contents) ? contents : Buffer.from(contents, "utf8"),
        name
      );
    }
    zip.end();
  });
}

/**
 * Helper function to convert an object to form-urlencoded string.
 * Useful for testing OAuth endpoints that expect application/x-www-form-urlencoded content type.
 *
 * @param obj Object to convert to form-urlencoded string
 * @returns Form-urlencoded string representation of the object
 */
export function toFormData(
  obj: Record<string, string | number | boolean | null | undefined>
): string {
  return Object.entries(obj)
    .filter(
      (entry): entry is [string, string | number | boolean] =>
        entry[1] !== undefined && entry[1] !== null
    )
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");
}

/**
 * Types a partial request context for unit testing middleware that only reads
 * the properties provided.
 *
 * @param value the partial context.
 * @returns the value typed as a request context.
 */
export function buildMockContext(value: object): AppContext {
  return value as AppContext;
}
