import * as React from "react";
import ReactDOMServer from "react-dom/server";
import env from "@server/env";
import type { ManifestStructure } from "./readManifestFile";
import readManifestFile from "./readManifestFile";

const prefetchTags = [];

if (env.FILE_STORAGE === "s3") {
  if (env.AWS_S3_ACCELERATE_URL) {
    prefetchTags.push(
      <link
        rel="preconnect"
        href={env.AWS_S3_ACCELERATE_URL}
        key={env.AWS_S3_ACCELERATE_URL}
      />
    );
  } else if (env.AWS_S3_UPLOAD_BUCKET_URL) {
    prefetchTags.push(
      <link
        rel="preconnect"
        href={env.AWS_S3_UPLOAD_BUCKET_URL}
        key={env.AWS_S3_UPLOAD_BUCKET_URL}
      />
    );
  }
}
if (env.CDN_URL) {
  prefetchTags.push(
    <link rel="preconnect" href={env.CDN_URL} key={env.CDN_URL} />
  );
}

// When a CDN is configured assets are served from it, otherwise from this app
// under its (possibly sub-path) base path.
const assetBase = env.CDN_URL || env.basePath;

if (env.isProduction) {
  const manifest = readManifestFile();

  const returnFileAndImportsFromManifest = (
    manifestStructure: ManifestStructure,
    file: string
  ): string[] => [
    manifestStructure[file]["file"],
    ...(manifestStructure[file]["imports"] ?? []).map(
      (entry: string) => manifestStructure[entry]["file"]
    ),
  ];

  Array.from([
    ...returnFileAndImportsFromManifest(manifest, "app/index.tsx"),
    ...returnFileAndImportsFromManifest(manifest, "app/editor/index.tsx"),
  ]).forEach((file) => {
    if (file.endsWith(".js")) {
      prefetchTags.push(
        <link
          rel="prefetch"
          href={`${assetBase}/static/${file}`}
          key={file}
          as="script"
          crossOrigin="anonymous"
        />
      );
    } else if (file.endsWith(".css")) {
      prefetchTags.push(
        <link
          rel="prefetch"
          href={`${assetBase}/static/${file}`}
          key={file}
          as="style"
          crossOrigin="anonymous"
        />
      );
    }
  });
}

export default ReactDOMServer.renderToString(<>{prefetchTags}</>);
