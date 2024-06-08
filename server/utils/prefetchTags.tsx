import * as React from "react";
import ReactDOMServer from "react-dom/server";
import env from "@server/env";
import readManifestFile, { ManifestStructure } from "./readManifestFile";

const prefetchTags = [];

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
if (env.CDN_URL) {
  prefetchTags.push(
    <link rel="preconnect" href={env.CDN_URL} key={env.CDN_URL} />
  );
}

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
          href={`${env.CDN_URL || ""}/static/${file}`}
          key={file}
          as="script"
          crossOrigin="anonymous"
        />
      );
    } else if (file.endsWith(".css")) {
      prefetchTags.push(
        <link
          rel="prefetch"
          href={`${env.CDN_URL || ""}/static/${file}`}
          key={file}
          as="style"
          crossOrigin="anonymous"
        />
      );
    }
  });
}

export default ReactDOMServer.renderToString(<>{prefetchTags}</>);
