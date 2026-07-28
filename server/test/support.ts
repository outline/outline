import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import type { Transaction } from "sequelize";
import { afterEach, beforeEach, vi } from "vitest";
import sharedEnv from "@shared/env";
import { createContext } from "@server/context";
import env from "@server/env";
import type { User } from "@server/models";
import onerror from "@server/onerror";
import { BaseTask } from "@server/queues/tasks/base/BaseTask";
import webService from "@server/services/web";
import { sequelize } from "@server/storage/database";
import type { APIContext } from "@server/types";
import { AuthenticationType } from "@server/types";
import ZipHelper from "@server/utils/ZipHelper";
import TestServer from "./TestServer";

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
 * Set the environment to be self hosted.
 */
export function setSelfHosted() {
  env.URL = sharedEnv.URL = `https://${faker.internet.domainName()}`;
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
