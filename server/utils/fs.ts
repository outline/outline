import path from "path";
import fs from "fs-extra";

export function serializeFilename(text: string): string {
  return text.replace(/\//g, "%2F").replace(/\\/g, "%5C");
}

export function deserializeFilename(text: string): string {
  return text.replace(/%2F/g, "/").replace(/%5C/g, "\\");
}

export function getFilenamesInDirectory(dirName: string): string[] {
  return fs
    .readdirSync(dirName)
    .filter(
      (file) =>
        file.indexOf(".") !== 0 &&
        file.match(/\.[jt]s$/) &&
        file !== path.basename(__filename) &&
        !file.includes(".test")
    );
}

export function requireDirectory<T>(dirName: string): [T, string][] {
  return getFilenamesInDirectory(dirName).map((fileName) => {
    const filePath = path.join(dirName, fileName);
    const name = path.basename(filePath.replace(/\.[jt]s$/, ""));
    return [require(filePath), name];
  });
}
