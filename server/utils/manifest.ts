import fs from "fs";
import path from "path";

type ManifestFile = Record<
  string,
  {
    file: string;
    src: string;
    isEntry?: boolean;
  }
>;

const file = path.resolve("./build/app/manifest.json");

let manifest;

try {
  manifest = fs.readFileSync(file, "utf8");
  manifest = JSON.parse(manifest);
} catch (err) {
  console.warn(
    `Can not find ${file}. Try executing "yarn vite:build" before running in production mode.`
  );

  manifest = {};
}

export default manifest as ManifestFile;
