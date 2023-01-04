import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { find } from "lodash";
import tmp from "tmp";
import { ValidationError } from "@server/errors";
import { trace } from "@server/logging/tracing";
import { deserializeFilename } from "./fs";

export type FileTreeNode = {
  /** The title, extracted from the file name */
  title: string;
  /** The file name including extension */
  name: string;
  /** Full path to the file within the zip file */
  path: string;
  /** Any nested children */
  children: FileTreeNode[];
};

@trace()
export default class ZipHelper {
  /**
   * Converts the flat structure returned by JSZIP into a nested file structure
   * for easier processing.
   *
   * @param zip The JSZip instance
   * @param maxFiles The maximum number of files to unzip (Prevent zip bombs)
   */
  public static toFileTree(
    zip: JSZip,
    /** The maximum number of files to unzip */
    maxFiles = 10000
  ) {
    let fileCount = 0;
    const paths = Object.keys(zip.files).map((filePath) => {
      if (++fileCount > maxFiles) {
        throw ValidationError("Too many files in zip");
      }

      return `/${filePath}`;
    });
    const tree: FileTreeNode[] = [];

    paths.forEach(function (filePath) {
      if (filePath.startsWith("/__MACOSX")) {
        return;
      }

      const pathParts = filePath.split("/");

      // Remove first blank element from the parts array.
      pathParts.shift();

      let currentLevel = tree; // initialize currentLevel to root

      pathParts.forEach(function (name) {
        // check to see if the path already exists.
        const existingPath = find(currentLevel, {
          name,
        });

        if (existingPath) {
          // The path to this item was already in the tree, so don't add again.
          // Set the current level to this path's children
          currentLevel = existingPath.children;
        } else if (name.endsWith(".DS_Store") || !name) {
          return;
        } else {
          const newPart = {
            name,
            path: filePath.replace(/^\//, ""),
            title: deserializeFilename(path.parse(path.basename(name)).name),
            children: [],
          };

          currentLevel.push(newPart);
          currentLevel = newPart.children;
        }
      });
    });

    return tree;
  }

  /**
   * Adds content to a zip file, if the given filename already exists in the zip
   * then it will automatically increment numbers at the end of the filename.
   *
   * @param zip JSZip object to add to
   * @param key File name with extension
   * @param content the content to add
   * @param options options for added content
   *
   * @returns The filename that was added to the zip (May be different than the key)
   */
  public static addToArchive(
    zip: JSZip,
    key: string,
    content: string | Uint8Array | ArrayBuffer | Blob,
    options: JSZip.JSZipFileOptions
  ) {
    // @ts-expect-error root exists
    const root = zip.root;

    // Filenames in the directory already
    const keysInDirectory = Object.keys(zip.files)
      .filter((k) => k.includes(root))
      .filter((k) => !k.endsWith("/"))
      .map((k) => path.basename(k).replace(/\s\((\d+)\)\./, "."));

    // The number of duplicate filenames
    const existingKeysCount = keysInDirectory.filter((t) => t === key).length;
    const filename = path.parse(key).name;
    const extension = path.extname(key);

    // Construct the new de-duplicated filename (if any)
    const safeKey =
      existingKeysCount > 0
        ? `${filename} (${existingKeysCount})${extension}`
        : key;

    zip.file(safeKey, content, options);
    return safeKey;
  }

  /**
   * Write a zip file to a temporary disk location
   *
   * @param zip JSZip object
   * @returns pathname of the temporary file where the zip was written to disk
   */
  public static async toTmpFile(zip: JSZip): Promise<string> {
    return new Promise((resolve, reject) => {
      tmp.file(
        {
          prefix: "export-",
          postfix: ".zip",
        },
        (err, path) => {
          if (err) {
            return reject(err);
          }
          zip
            .generateNodeStream({
              type: "nodebuffer",
              streamFiles: true,
            })
            .pipe(fs.createWriteStream(path))
            .on("finish", () => resolve(path))
            .on("error", reject);
        }
      );
    });
  }
}
