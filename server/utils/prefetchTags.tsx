import * as React from "react";
import ReactDOMServer from "react-dom/server";
import env from "@server/env";
import readManifestFile from "./readManifestFile";

const isProduction = env.ENVIRONMENT === "production";

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

if (isProduction) {
  const manifest = readManifestFile();

  Object.keys(manifest).forEach((filename) => {
    const file = manifest[filename]["file"];

    if (typeof file !== "string") {
      return;
    }
    if (!env.CDN_URL) {
      return;
    }

    if (file.endsWith(".js")) {
      //  Preload resources you have high-confidence will be used in the current
      // page.Prefetch resources likely to be used for future navigations
      // TODO: Doesn’t apply to any file after switching to Vite.
      // "app/index.tsx"
      // “app/editor/index.tsx"
      // and their imports

      const shouldPreload =
        file.includes("/main") ||
        file.includes("/runtime") ||
        file.includes("preload-");

      if (shouldPreload) {
        prefetchTags.push(
          <link rel="preload" href={file} key={file} as="script" />
        );
      }
    } else if (file.endsWith(".css")) {
      prefetchTags.push(
        <link rel="prefetch" href={file} key={file} as="style" />
      );
    }
  });
}

// @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'Element[]' is not assignable to ... Remove this comment to see the full error message
export default ReactDOMServer.renderToString(prefetchTags);
