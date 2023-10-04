import env from "@server/env";
import LocalStorage from "./LocalStorage";
import S3Storage from "./S3Storage";

const storage =
  env.FILE_STORAGE === "local" ? new LocalStorage() : new S3Storage();

export default storage;
