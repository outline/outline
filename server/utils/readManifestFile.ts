import fs from "node:fs";
import path from "node:path";
import Logger from "@server/logging/Logger";

export type Chunk = {
  file: string;
  imports: string[];
  src: string;
  isEntry?: boolean;
};

export type ManifestStructure = Record<string, Chunk>;

/**
 * Reads and parses the Vite build manifest from disk, returning an empty
 * manifest if the file cannot be found.
 *
 * @param file the path to the manifest file.
 * @returns the parsed manifest structure.
 */
export const readManifestFile = (file = "./build/app/.vite/manifest.json") => {
  const absoluteFilePath = path.resolve(file);

  let manifest = "{}";

  try {
    manifest = fs.readFileSync(absoluteFilePath, "utf8") as string;
  } catch (_err) {
    Logger.warn(
      `Can not find ${absoluteFilePath}. Try executing "yarn vite:build" before running in production mode.`
    );
  }

  return JSON.parse(manifest) as ManifestStructure;
};

export default readManifestFile;
