import env from "@server/env";
import type BaseStorage from "./BaseStorage";
import LocalStorage from "./LocalStorage";

// S3Storage is required lazily rather than imported so the AWS SDK and its
// native CRT binding are only loaded into memory when S3 storage is in use.
const storage: BaseStorage =
  env.FILE_STORAGE === "local"
    ? new LocalStorage()
    : // oxlint-disable-next-line @typescript-eslint/no-require-imports
      new (require("./S3Storage").default)();

export default storage;
