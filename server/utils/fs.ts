import path from "node:path";
import fs from "fs-extra";

const windowsInvalidFileNameCharsRegex = /[\\/:*?"<>|]/g;
const windowsTrailingFileNameCharsRegex = /[. ]+$/g;
const encodedWindowsCharacters: Record<string, string> = {
  "%2F": "/",
  "%5C": "\\",
  "%3A": ":",
  "%2A": "*",
  "%3F": "?",
  "%22": '"',
  "%3C": "<",
  "%3E": ">",
  "%7C": "|",
  "%2E": ".",
  "%20": " ",
};
const encodedWindowsCharactersRegex = /%(?:2F|5C|3A|2A|3F|22|3C|3E|7C|2E|20)/gi;

/**
 * Encodes a single character to uppercase percent-encoding.
 *
 * @param char The character to encode.
 * @returns The encoded character.
 */
function encodeWindowsUnsafeCharacter(char: string): string {
  return `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`;
}

/**
 * Serialize a file name for inclusion in a ZIP.
 *
 * @param text The file name to serialize.
 * @returns The serialized file name.
 */
export function serializeFilename(text: string): string {
  const encoded = text.replace(
    windowsInvalidFileNameCharsRegex,
    encodeWindowsUnsafeCharacter
  );

  return encoded.replace(windowsTrailingFileNameCharsRegex, (trailing) =>
    trailing.split("").map(encodeWindowsUnsafeCharacter).join("")
  );
}

/**
 * Deserialize a file name serialized with `serializeFilename`.
 *
 * @param text The file name to deserialize.
 * @returns The deserialized file name.
 */
export function deserializeFilename(text: string): string {
  return text.replace(
    encodedWindowsCharactersRegex,
    (match) => encodedWindowsCharacters[match.toUpperCase()] ?? match
  );
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
 * Safely slice a string to a maximum byte length without breaking UTF-8 characters.
 *
 * @param str The string to slice.
 * @param maxBytes The maximum byte length.
 * @returns The sliced string.
 */
function sliceStringToByteLength(str: string, maxBytes: number): string {
  if (maxBytes <= 0) {
    return "";
  }

  const buffer = Buffer.from(str, "utf8");
  if (buffer.length <= maxBytes) {
    return str;
  }

  // Work backwards from maxBytes to find valid UTF-8 boundary
  for (let i = maxBytes; i > 0; i--) {
    const slice = buffer.subarray(0, i);
    const result = slice.toString("utf8");
    // Check if the result round-trips correctly (no replacement characters)
    if (Buffer.from(result, "utf8").equals(slice)) {
      return result;
    }
  }

  return "";
}

/**
 * Trim a file name to a maximum length, retaining the extension. The input
 * must be a filename only — passing a path (containing `/` or `\`) will throw.
 *
 * @param text The file name to trim.
 * @param length The maximum length of the file name in bytes.
 * @returns The trimmed file name.
 * @throws If `text` contains a path separator.
 */
export function trimFilenameAndExt(text: string, length: number): string {
  if (text.includes("/") || text.includes("\\")) {
    throw new Error(
      "trimFilenameAndExt expects a filename without path separators"
    );
  }

  if (Buffer.byteLength(text, "utf8") > length) {
    const ext = path.extname(text);
    const name = path.basename(text, ext);
    const extByteLength = Buffer.byteLength(ext, "utf8");
    const availableBytesForName = length - extByteLength;

    if (availableBytesForName <= 0) {
      // If extension is too long, trim the whole filename
      return sliceStringToByteLength(text, length);
    }

    const trimmedName = sliceStringToByteLength(name, availableBytesForName);
    return trimmedName + ext;
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

// Optional cache used in tests, where Node's require() cannot resolve
// TypeScript files with aliased imports. Populated by the test setup with
// modules pre-loaded via Vite's import.meta.glob, keyed by directory suffix.
const requireDirectoryCache = new Map<string, Record<string, unknown>>();

/**
 * Pre-populate requireDirectory's module cache. Intended for use only by the
 * Vitest test setup; production code should not call this.
 *
 * @param suffix The directory path suffix to match against.
 * @param modules The eagerly-loaded modules.
 */
export function __setRequireDirectoryCache(
  suffix: string,
  modules: Record<string, unknown>
): void {
  requireDirectoryCache.set(suffix, modules);
}

/**
 * Require all files in a directory and return them as an array of tuples.
 *
 * @param dirName The directory to search.
 * @returns An array of tuples containing the required files and their names.
 */
export function requireDirectory<T>(dirName: string): [T, string][] {
  for (const [suffix, modules] of requireDirectoryCache) {
    if (dirName.endsWith(suffix)) {
      return Object.entries(modules)
        .filter(
          ([filePath]) =>
            !filePath.endsWith("/index.ts") &&
            !filePath.endsWith("/index.js") &&
            !filePath.includes(".test.")
        )
        .map(([filePath, mod]) => {
          const base = filePath.split("/").pop() ?? filePath;
          const id = base.replace(/\.[jt]s$/, "");
          return [mod as T, id];
        });
    }
  }
  return getFilenamesInDirectory(dirName).map((fileName) => {
    const filePath = path.join(dirName, fileName);
    const name = path.basename(filePath.replace(/\.[jt]s$/, ""));

    return [require(filePath), name];
  });
}
