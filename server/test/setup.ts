import "reflect-metadata";
import { EventEmitter } from "node:events";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import sharedEnv from "@shared/env";
import env from "@server/env";
import { server } from "./msw";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Increase the default max listeners for EventEmitter to prevent warnings in tests
// This needs to be done before any modules that use EventEmitter are loaded
EventEmitter.defaultMaxListeners = 100;

// Mock AWS SDK S3 client and related commands
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn(),
  })),
  DeleteObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
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
  "../../plugins/*/server/!(*.test|schema).{js,ts}",
  { eager: true }
);
void pluginModules;
// Mark as loaded so PluginManager.loadPlugins() (which uses require()) is a
// no-op during tests.
(PluginManager as unknown as { loaded: boolean }).loaded = true;

beforeEach(() => {
  env.URL = sharedEnv.URL = "https://app.outline.dev";
});
