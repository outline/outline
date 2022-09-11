import fs from "fs";
import path from "path";
import * as React from "react";
import ReactDOMServer from "react-dom/server";
import env from "@server/env";

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
  // no-op
}

Object.values(manifestData).forEach((filename) => {
  if (typeof filename !== "string") {
    return;
  }
  if (!env.CDN_URL) {
    return;
  }

  if (filename.endsWith(".js")) {
    //  Preload resources you have high-confidence will be used in the current
    // page.Prefetch resources likely to be used for future navigations
    const shouldPreload =
      filename.includes("/main") ||
      filename.includes("/runtime") ||
      filename.includes("preload-");

    if (shouldPreload) {
      prefetchTags.push(
        <link rel="preload" href={filename} key={filename} as="script" />
      );
    }
  } else if (filename.endsWith(".css")) {
    prefetchTags.push(
      <link rel="prefetch" href={filename} key={filename} as="style" />
    );
  }
});

// @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'Element[]' is not assignable to ... Remove this comment to see the full error message
export default ReactDOMServer.renderToString(prefetchTags);
