import path from "path";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'fs-e... Remove this comment to see the full error message
import fs from "fs-extra";

export function serializeFilename(text: string): string {
  return text.replace(/\//g, "%2F").replace(/\\/g, "%5C");
}

export function deserializeFilename(text: string): string {
  return text.replace(/%2F/g, "/").replace(/%5C/g, "\\");
}

export function requireDirectory<T>(dirName: string): [T, string][] {
  return (
    fs
      .readdirSync(dirName)
      .filter(
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'file' implicitly has an 'any' type.
        (file) =>
          file.indexOf(".") !== 0 &&
          file.endsWith(".js") &&
          file !== path.basename(__filename) &&
          !file.includes(".test")
      )
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'fileName' implicitly has an 'any' type.
      .map((fileName) => {
        const filePath = path.join(dirName, fileName);
        const name = path.basename(filePath.replace(/\.js$/, ""));
        return [require(filePath), name];
      })
  );
}
