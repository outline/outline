/* eslint-disable @typescript-eslint/no-var-requires */

const exec = require("child_process").execSync;
const fs = require("fs");
const path = require("path");

const sslDir = path.join(__dirname, "..", "config", "certs");
const sslCert = path.join(sslDir, "public.cert");
const sslKey = path.join(sslDir, "private.key");

if (!fs.existsSync(sslKey) || !fs.existsSync(sslCert)) {
  try {
    exec(
      `mkcert -cert-file ${sslDir}/public.cert -key-file ${sslDir}/private.key "*.outline.dev" && mkcert -install`
    );
    console.log("🔒 Local SSL certificate created");
  } catch (e) {
    console.log(
      "SSL certificates could not be generated. Ensure mkcert is installed and in your PATH"
    );
    console.log(e.message);
  }
}
