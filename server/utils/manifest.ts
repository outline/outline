import fs from "fs";
import path from "path";

type Chunk = {
  file: string;
  src: string;
  isEntry?: boolean;
};

type ManifestStructure = Record<string, Chunk>;

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

export default manifest as ManifestStructure;
