import fs from "fs";
import path from "path";
import env from "../env";

/**
 * Find if SSL certs are available in the environment or filesystem and return
 * as a valid ServerOptions object
 */
export function getSSLOptions() {
  function safeReadFile(name: string) {
    try {
      return fs.readFileSync(
        path.normalize(`${__dirname}/../../../${name}`),
        "utf8"
      );
    } catch (err) {
      return undefined;
    }
  }

  try {
    return {
      key:
        (env.SSL_KEY
          ? Buffer.from(env.SSL_KEY, "base64").toString("ascii")
          : undefined) ||
        safeReadFile("private.key") ||
        safeReadFile("private.pem") ||
        safeReadFile("server/config/certs/private.key"),
      cert:
        (env.SSL_CERT
          ? Buffer.from(env.SSL_CERT, "base64").toString("ascii")
          : undefined) ||
        safeReadFile("public.cert") ||
        safeReadFile("public.pem") ||
        safeReadFile("server/config/certs/public.cert"),
    };
  } catch (err) {
    return {
      key: undefined,
      cert: undefined,
    };
  }
}
