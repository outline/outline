import env from "@server/env";
import type BaseStorage from "./BaseStorage";
import LocalStorage from "./LocalStorage";
import S3Storage from "./S3Storage";

// Only the configured backend is instantiated. S3Storage requires the AWS SDK
// lazily, so the SDK and its native CRT binding are never loaded into memory
// when local file storage is in use.
const storage: BaseStorage =
  env.FILE_STORAGE === "local" ? new LocalStorage() : new S3Storage();

export default storage;
