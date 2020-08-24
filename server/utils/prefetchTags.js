// @flow
import fs from "fs";
import path from "path";
import * as React from "react";
import webpackConfig from "../../webpack.config";

const PUBLIC_PATH = webpackConfig.output.publicPath;

const prefetchTags = [
  <link
    rel="dns-prefetch"
    href={process.env.AWS_S3_UPLOAD_BUCKET_URL}
    key="dns"
  />,
];

try {
  const manifest = fs.readFileSync(
    path.join(__dirname, "../../app/manifest.json"),
    "utf8"
  );
  const manifestData = JSON.parse(manifest);
  Object.values(manifestData).forEach((filename) => {
    if (typeof filename !== "string") return;
    if (filename.endsWith(".js")) {
      prefetchTags.push(
        <link
          rel="prefetch"
          href={`${PUBLIC_PATH}${filename}`}
          key={filename}
          as="script"
        />
      );
    } else if (filename.endsWith(".css")) {
      prefetchTags.push(
        <link
          rel="prefetch"
          href={`${PUBLIC_PATH}${filename}`}
          key={filename}
          as="style"
        />
      );
    }
  });
} catch (_e) {
  // no-op
}

export default prefetchTags;
