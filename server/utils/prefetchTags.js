// @flow
import fs from "fs";
import path from "path";
import * as React from "react";
import ReactDOMServer from "react-dom/server";
import env from "../env";

const prefetchTags = [];

if (process.env.AWS_S3_UPLOAD_BUCKET_URL) {
  prefetchTags.push(
    <link
      rel="dns-prefetch"
      href={process.env.AWS_S3_UPLOAD_BUCKET_URL}
      key="dns"
    />
  );
}

let manifestData = {};
try {
  const manifest = fs.readFileSync(
    path.join(__dirname, "../../app/manifest.json"),
    "utf8"
  );
  manifestData = JSON.parse(manifest);
} catch (err) {
  console.warn(err);
}

Object.values(manifestData).forEach((filename) => {
  if (typeof filename !== "string") return;
  if (!env.CDN_URL) return;

  if (filename.endsWith(".js")) {
    prefetchTags.push(
      <link
        rel="prefetch"
        href={`${env.CDN_URL}${filename}`}
        key={filename}
        as="script"
      />
    );
  } else if (filename.endsWith(".css")) {
    prefetchTags.push(
      <link
        rel="prefetch"
        href={`${env.CDN_URL}${filename}`}
        key={filename}
        as="style"
      />
    );
  }
});

export default ReactDOMServer.renderToString(prefetchTags);
