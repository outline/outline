import path from "path";
import fs from "fs-extra";

/**
 * Serialize a file name for inclusion in a ZIP.
 *
 * @param text The file name to serialize.
 * @returns The serialized file name.
 */
export function serializeFilename(text: string): string {
  return text.replace(/\//g, "%2F").replace(/\\/g, "%5C");
}

/**
 * Deserialize a file name serialized with `serializeFilename`.
 *
 * @param text The file name to deserialize.
 * @returns The deserialized file name.
 */
export function deserializeFilename(text: string): string {
  return text.replace(/%2F/g, "/").replace(/%5C/g, "\\");
}

/**
 * Get the UTF8 byte length of a string.
 *
 * @param str The string to measure.
 * @returns The byte length of the string.
 */
export function stringByteLength(str: string): number {
  return Buffer.byteLength(str, "utf8");
}

/**
 * Trim a file name to a maximum length, retaining the extension.
 *
 * @param text The file name to trim.
 * @param length The maximum length of the file name.
 * @returns The trimmed file name.
 */
export function trimFileAndExt(text: string, length: number): string {
  if (stringByteLength(text) > length) {
    const ext = path.extname(text);
    const name = path.basename(text, ext);
    return name.slice(0, length - stringByteLength(ext)) + ext;
  }
  return text;
}

/**
 * Get a list of file names in a directory.
 *
 * @param dirName The directory to search.
 * @returns A list of file names in the directory.
 */
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

/**
 * Require all files in a directory and return them as an array of tuples.
 *
 * @param dirName The directory to search.
 * @returns An array of tuples containing the required files and their names.
 */
export function requireDirectory<T>(dirName: string): [T, string][] {
  return getFilenamesInDirectory(dirName).map((fileName) => {
    const filePath = path.join(dirName, fileName);
    const name = path.basename(filePath.replace(/\.[jt]s$/, ""));
    return [require(filePath), name];
  });
}
