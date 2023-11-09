import fs from "fs";
import path from "path";
import JSZip from "jszip";
import find from "lodash/find";
import tmp from "tmp";
import { bytesToHumanReadable } from "@shared/utils/files";
import { ValidationError } from "@server/errors";
import Logger from "@server/logging/Logger";
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
  public static defaultStreamOptions: JSZip.JSZipGeneratorOptions<"nodebuffer"> =
    {
      type: "nodebuffer",
      streamFiles: true,
      compression: "DEFLATE",
      compressionOptions: {
        level: 5,
      },
    };

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
    const paths = ZipHelper.getPathsInZip(zip, maxFiles);
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
  public static async toTmpFile(
    zip: JSZip,
    options?: JSZip.JSZipGeneratorOptions<"nodebuffer">
  ): Promise<string> {
    Logger.debug("utils", "Creating tmp file…");
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

          let previousMetadata: JSZip.JSZipMetadata = {
            percent: 0,
            currentFile: null,
          };

          const dest = fs
            .createWriteStream(path)
            .on("finish", () => {
              Logger.debug("utils", "Writing zip complete", { path });
              return resolve(path);
            })
            .on("error", reject);

          zip
            .generateNodeStream(
              {
                ...this.defaultStreamOptions,
                ...options,
              },
              (metadata) => {
                if (metadata.currentFile !== previousMetadata.currentFile) {
                  const percent = Math.round(metadata.percent);
                  const memory = process.memoryUsage();

                  previousMetadata = {
                    currentFile: metadata.currentFile,
                    percent,
                  };
                  Logger.debug(
                    "utils",
                    `Writing zip file progress… ${percent}%`,
                    {
                      currentFile: metadata.currentFile,
                      memory: bytesToHumanReadable(memory.rss),
                    }
                  );
                }
              }
            )
            .on("error", (err) => {
              dest.end();
              reject(err);
            })
            .pipe(dest);
        }
      );
    });
  }

  /**
   * Gets a list of file paths contained within the ZIP file, accounting for
   * differences between OS.
   *
   * @param zip The JSZip instance
   * @param maxFiles The maximum number of files to unzip (Prevent zip bombs)
   */
  private static getPathsInZip(zip: JSZip, maxFiles = 10000) {
    let fileCount = 0;
    const paths: string[] = [];

    Object.keys(zip.files).forEach((p) => {
      if (++fileCount > maxFiles) {
        throw ValidationError("Too many files in zip");
      }

      const filePath = `/${p}`;

      // "zip.files" for ZIPs created on Windows does not return paths for
      // directories, so we must add them manually if missing.
      const dir = filePath.slice(0, filePath.lastIndexOf("/") + 1);
      if (dir.length > 1 && !paths.includes(dir)) {
        paths.push(dir);
      }

      paths.push(filePath);
    });
    return paths;
  }
}
