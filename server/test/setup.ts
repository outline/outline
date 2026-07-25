import "reflect-metadata";
import { EventEmitter } from "node:events";
import type { Job } from "bull";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import type { BaseTask } from "@server/queues/tasks/base/BaseTask";
import sharedEnv from "@shared/env";
import env from "@server/env";
import { server } from "./msw";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Increase the default max listeners for EventEmitter to prevent warnings in tests
// This needs to be done before any modules that use EventEmitter are loaded
EventEmitter.defaultMaxListeners = 100;

// Mock AWS SDK S3 client and related commands. The client must be a real
// class as it is instantiated with `new` via a dynamic import, which does not
// apply the spy-constructor interop that static imports receive.
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class MockS3Client {
    send = vi.fn();
  },
  DeleteObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  HeadObjectCommand: vi.fn(),
  CopyObjectCommand: vi.fn(),
  PutObjectCommand: vi.fn(),
  ObjectCannedACL: {},
}));

vi.mock("@aws-sdk/lib-storage", () => ({
  Upload: vi.fn(() => ({
    done: vi.fn(),
  })),
}));

vi.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

// Initialize the database models. Loaded dynamically so the
// EventEmitter.defaultMaxListeners assignment above runs first; static imports
// would be hoisted ahead of it.
await import("@server/storage/database");

// Eagerly load plugin server entry points so that PluginManager.getHooks()
// returns the registered plugins. Vitest does not support require() of TS
// files with bare imports (e.g. `@server/...`), so we use Vite's
// import.meta.glob to load them through the Vite resolver instead.
const { PluginManager } = await import("@server/utils/PluginManager");
const pluginModules = import.meta.glob(
  ["../../plugins/*/server/*.{js,ts}", "!**/*.test.*", "!**/schema.*"],
  { eager: true }
);
void pluginModules;
// Mark as loaded so PluginManager.loadPlugins() (which uses require()) is a
// no-op during tests.
(PluginManager as unknown as { loaded: boolean }).loaded = true;

// No worker consumes the task queue in tests, so a scheduled task is performed
// lazily by the job handle instead. Callers that block on the result get it;
// scheduling alone stays a no-op, as it is when the queue has no processor.
const { BaseTask: BaseTaskClass } =
  await import("@server/queues/tasks/base/BaseTask");

beforeEach(() => {
  env.URL = sharedEnv.URL = "https://app.outline.dev";

  vi.spyOn(BaseTaskClass.prototype, "schedule").mockImplementation(function (
    this: BaseTask<object>,
    props: object
  ) {
    return Promise.resolve({
      finished: () => this.perform(props),
    } as Job);
  });
});
