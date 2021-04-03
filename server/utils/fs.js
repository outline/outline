// @flow
import path from "path";
import fs from "fs-extra";

export function requireDirectory<T>(dirName: string): [T, string][] {
  return fs
    .readdirSync(dirName)
    .filter(
      (file) =>
        file.indexOf(".") !== 0 &&
        file.endsWith(".js") &&
        file !== path.basename(__filename) &&
        !file.includes(".test")
    )
    .map((fileName) => {
      const filePath = path.join(dirName, fileName);
      const name = path.basename(filePath.replace(/\.js$/, ""));

      // $FlowIssue
      return [require(filePath), name];
    });
}
