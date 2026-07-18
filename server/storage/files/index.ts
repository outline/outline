import env from "@server/env";
import type BaseStorage from "./BaseStorage";

// The storage module is required lazily rather than imported so only the
// configured backend and its dependency tree (for S3, the AWS SDK and its
// native CRT binding) are loaded into memory.
/* oxlint-disable @typescript-eslint/no-require-imports */
const storage: BaseStorage =
  env.FILE_STORAGE === "local"
    ? new (require("./LocalStorage").default)()
    : new (require("./S3Storage").default)();
/* oxlint-enable @typescript-eslint/no-require-imports */

export default storage;
