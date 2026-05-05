// This file runs before the test environment is set up to ensure mocks are registered early.
// It prevents real Redis clients from being initialized during module imports.

import { vi } from "vitest";
import type * as IORedisMock from "ioredis-mock";
import { __setRequireDirectoryCache } from "@server/utils/fs";

// Pre-populate the requireDirectory cache used by @server/utils/fs so that
// tasks/processors/email-templates can be looked up via their pre-loaded
// modules instead of via Node's require(), which cannot resolve TypeScript
// files with aliased imports under Vitest. The eager globs intentionally
// exclude index.ts files (which call requireDirectory themselves and would
// recurse) and any files whose imports would themselves load the directory
// they live in.
__setRequireDirectoryCache(
  "emails/templates",
  import.meta.glob("../emails/templates/!(index|*.test).{js,ts}", {
    eager: true,
  })
);
__setRequireDirectoryCache(
  "queues/processors",
  import.meta.glob("../queues/processors/!(index|*.test).{js,ts}", {
    eager: true,
  })
);
__setRequireDirectoryCache(
  "queues/tasks",
  import.meta.glob("../queues/tasks/!(index|*.test).{js,ts}", {
    eager: true,
  })
);

vi.mock("ioredis", async () => {
  const mod = await vi.importActual<typeof IORedisMock>("ioredis-mock");
  return mod;
});

vi.mock("@server/utils/MutexLock");

vi.mock("@aws-sdk/signature-v4-crt", () => ({}));

// Auto-mock these modules using the corresponding files under server/__mocks__/.
// In Jest, __mocks__ next to a `roots` directory is auto-applied; vitest
// requires an explicit vi.mock() call to wire them up.
vi.mock("bull", () => import("../__mocks__/bull"));
vi.mock("dd-trace", async () => {
  const mod = await import("../__mocks__/dd-trace");
  return { default: mod.mockTracer, ...mod };
});
vi.mock("franc", () => import("../__mocks__/franc"));
vi.mock("iso-639-3", () => import("../__mocks__/iso-639-3"));
vi.mock(
  "request-filtering-agent",
  () => import("../__mocks__/request-filtering-agent")
);
