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
