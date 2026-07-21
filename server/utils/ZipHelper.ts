import path from "node:path";
import fs from "fs-extra";
import tmp from "tmp";
import type { Entry } from "yauzl";
import yauzl, { validateFileName } from "yauzl";
import type { ZipFile } from "yazl";
import { bytesToHumanReadable } from "@shared/utils/files";
import { ValidationError } from "@server/errors";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import { deserializeFilename, trimFilenameAndExt } from "./fs";

const MAX_FILE_NAME_LENGTH = 255;

export interface ZipEntryHandle {
  /** UTF-8 filename as recorded in the zip; directory entries end with `/`. */
  fileName: string;
  /** Size of the uncompressed entry in bytes. */
  uncompressedSize: number;
  /** True when this entry is a directory marker rather than a file. */
  isDirectory: boolean;
  /**
   * Read the entry's contents into memory. Safe to skip — entries the caller
   * does not read are simply advanced past.
   *
   * @param maxSize Maximum uncompressed size to read into memory, in bytes.
   */
  readBuffer(maxSize: number): Promise<Buffer>;
}

export interface ZipTreeNode {
  /** The file name (last path segment) including extension. */
  name: string;
  /** Title derived from the file name (extension stripped, deserialized). */
  title: string;
  /** Path within the zip (no leading slash, segments joined with `/`). */
  pathInZip: string;
  /** Nested children — populated for directory entries. */
  children: ZipTreeNode[];
}

/**
 * Helper for creating and reading zip files.
 */
@trace()
export default class ZipHelper {
  /**
   * Write a zip file to a temporary disk location.
   *
   * The caller is responsible for adding entries to the `ZipFile`; this method
   * calls `end()` and waits for the output stream to drain to disk.
   *
   * @param zip yazl ZipFile object with entries already added.
   * @returns pathname of the temporary file where the zip was written to disk.
   */
  public static async toTmpFile(zip: ZipFile): Promise<string> {
    Logger.debug("utils", "Creating tmp file…");
    return new Promise((resolve, reject) => {
      tmp.file(
        {
          prefix: "export-",
          postfix: ".zip",
        },
        (err, filePath) => {
          if (err) {
            return reject(err);
          }

          const handleError = (error: Error) => {
            dest.destroy();
            fs.remove(filePath)
              .catch((rmErr) => {
                Logger.error("Failed to remove tmp file", rmErr);
              })
              .finally(() => {
                reject(error);
              });
          };

          const dest = fs
            .createWriteStream(filePath)
            .on("finish", () => {
              Logger.debug("utils", "Writing zip complete", { path: filePath });
              return resolve(filePath);
            })
            .on("error", handleError);

          zip.outputStream.on("error", handleError).pipe(dest);
          zip.end();
        }
      );
    });
  }

  /**
   * Iterate through entries in a zip file without extracting it to disk.
   * Entries are visited serially in archive order. `onEntry` may be async; the
   * next entry is only read once the previous handler resolves.
   *
   * @param filePath The file path where the zip is located.
   * @param onEntry Handler invoked for each entry. Skip an entry by returning
   *                without calling `entry.readBuffer(maxSize)`.
   * @returns Promise that resolves once the archive has been fully walked.
   */
  public static walk(
    filePath: string,
    onEntry: (entry: ZipEntryHandle) => Promise<void> | void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      yauzl.open(
        filePath,
        {
          lazyEntries: true,
          autoClose: true,
          decodeStrings: false,
        },
        function (err, zipfile) {
          if (err) {
            return reject(err);
          }

          let settled = false;
          const fail = (error: Error) => {
            if (settled) {
              return;
            }
            settled = true;
            zipfile.close();
            reject(error);
          };

          zipfile.on("entry", (entry: Entry) => {
            const fileName = Buffer.from(entry.fileName).toString("utf8");

            if (validateFileName(fileName)) {
              Logger.warn("Invalid zip entry", { fileName });
              zipfile.readEntry();
              return;
            }

            const handle: ZipEntryHandle = {
              fileName,
              uncompressedSize: entry.uncompressedSize,
              isDirectory: fileName.endsWith("/"),
              readBuffer: (maxSize) =>
                new Promise<Buffer>((res, rej) => {
                  if (entry.uncompressedSize > maxSize) {
                    return rej(ZipHelper.entryTooLargeError(fileName, maxSize));
                  }

                  zipfile.openReadStream(entry, (rErr, readStream) => {
                    if (rErr) {
                      return rej(rErr);
                    }
                    const chunks: Buffer[] = [];
                    let bytesRead = 0;
                    let settled = false;
                    readStream.on("data", (chunk: Buffer) => {
                      bytesRead += chunk.length;
                      if (bytesRead > maxSize) {
                        readStream.destroy(
                          ZipHelper.entryTooLargeError(fileName, maxSize)
                        );
                        return;
                      }
                      chunks.push(chunk);
                    });
                    readStream.on("end", () => {
                      if (!settled) {
                        settled = true;
                        res(Buffer.concat(chunks));
                      }
                    });
                    readStream.on("error", (err) => {
                      if (!settled) {
                        settled = true;
                        rej(err);
                      }
                    });
                    readStream.on("close", () => {
                      if (!settled) {
                        settled = true;
                        rej(
                          new Error(
                            `Stream closed before completing read of ${fileName}`
                          )
                        );
                      }
                    });
                  });
                }),
            };

            Promise.resolve()
              .then(() => onEntry(handle))
              .then(() => {
                if (!settled) {
                  zipfile.readEntry();
                }
              })
              .catch(fail);
          });

          zipfile.on("close", () => {
            if (!settled) {
              settled = true;
              resolve();
            }
          });
          zipfile.on("error", (error) => fail(error));
          zipfile.readEntry();
        }
      );
    });
  }

  /**
   * Walk a zip file once and build a tree of its entries without extracting
   * to disk. macOS metadata directories (`__MACOSX`) and dotfiles are
   * filtered out at any path segment.
   *
   * The optional `onFile` callback fires once per file entry as it is
   * encountered, with both the materialized tree node and a handle to the
   * raw entry. Callers that need to pre-load contents (e.g. small text
   * files) can call `entry.readBuffer(maxSize)`; callers that only need the tree
   * structure can omit the callback entirely.
   *
   * @param filePath Local filesystem path to the zip.
   * @param onFile Optional per-file hook; not called for directory entries.
   * @returns A synthetic root node whose `children` are the zip's top-level
   *          entries.
   */
  public static async toFileTree(
    filePath: string,
    onFile?: (node: ZipTreeNode, entry: ZipEntryHandle) => Promise<void> | void
  ): Promise<ZipTreeNode> {
    const root: ZipTreeNode = {
      name: "",
      title: "",
      pathInZip: "",
      children: [],
    };

    const isFiltered = (segment: string) =>
      segment === "__MACOSX" || segment.startsWith(".");

    const nodesByPath = new Map<string, ZipTreeNode>();

    const resolveNode = (entryName: string): ZipTreeNode | null => {
      // Drop empty segments and the path-no-op `.` (e.g. entries written as
      // `./Collection/page.md`). `..` is preserved so the dotfile filter
      // below rejects it — we never resolve path traversal in zip entries.
      const segments = entryName
        .split("/")
        .filter((s) => s !== "" && s !== ".");
      if (segments.length === 0) {
        return null;
      }

      let current = root;
      let pathSoFar = "";
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (isFiltered(segment)) {
          return null;
        }

        pathSoFar = pathSoFar ? `${pathSoFar}/${segment}` : segment;
        let next = nodesByPath.get(pathSoFar);
        if (!next) {
          next = {
            name: segment,
            title: deserializeFilename(path.parse(segment).name),
            pathInZip: pathSoFar,
            children: [],
          };
          current.children.push(next);
          nodesByPath.set(pathSoFar, next);
        }
        current = next;
      }

      return current;
    };

    await this.walk(filePath, async (entry) => {
      const node = resolveNode(entry.fileName);
      if (!node || entry.isDirectory) {
        return;
      }
      if (onFile) {
        await onFile(node, entry);
      }
    });

    return root;
  }

  /**
   * Write a zip file to a disk location
   *
   * @param filePath The file path where the zip is located
   * @param outputDir The directory where the zip should be extracted
   */
  public static extract(filePath: string, outputDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Logger.debug("utils", "Opening zip file", { filePath });

      yauzl.open(
        filePath,
        {
          lazyEntries: true,
          autoClose: true,
          // Filenames are validated inside on("entry") handler instead of within yauzl as some
          // otherwise valid zip files (including those in our test suite) include / path. We can
          // safely read but skip writing these.
          // see: https://github.com/thejoshwolfe/yauzl/issues/135
          decodeStrings: false,
        },
        function (err, zipfile) {
          if (err) {
            return reject(err);
          }
          try {
            zipfile.readEntry();
            zipfile.on("entry", function (entry: Entry) {
              const filePath = Buffer.from(entry.fileName).toString("utf8");
              Logger.debug("utils", "Extracting zip entry", { filePath });

              const processNext = (error?: NodeJS.ErrnoException | null) => {
                if (error) {
                  zipfile.close();
                  reject(error);
                  return;
                }
                zipfile.readEntry();
              };

              if (validateFileName(filePath)) {
                Logger.warn("Invalid zip entry", { filePath });
                processNext();
                return;
              }

              if (filePath.endsWith("/")) {
                // directory file names end with '/'
                fs.mkdirp(path.join(outputDir, filePath), (mkErr) =>
                  processNext(mkErr)
                );
              } else {
                // file entry
                zipfile.openReadStream(entry, function (rErr, readStream) {
                  if (rErr) {
                    return processNext(rErr);
                  }
                  // ensure parent directory exists
                  fs.mkdirp(
                    path.join(outputDir, path.dirname(filePath)),
                    function (mkErr) {
                      if (mkErr) {
                        return processNext(mkErr);
                      }

                      const fileName = trimFilenameAndExt(
                        path.basename(filePath),
                        MAX_FILE_NAME_LENGTH
                      );

                      const resolvedOutput = path.resolve(outputDir);
                      const location = path.resolve(
                        resolvedOutput,
                        path.dirname(filePath),
                        fileName
                      );

                      if (
                        location !== resolvedOutput &&
                        !location.startsWith(resolvedOutput + path.sep)
                      ) {
                        Logger.warn("Zip entry escapes extraction directory", {
                          filePath,
                          location,
                        });
                        readStream.destroy();
                        return processNext();
                      }

                      const dest = fs
                        .createWriteStream(location)
                        .on("error", (error) => {
                          readStream.destroy();
                          dest.destroy();
                          processNext(error);
                        });

                      readStream
                        .on("error", (error) => {
                          dest.destroy();
                          readStream.destroy();
                          processNext(error);
                        })
                        .on("end", function () {
                          processNext();
                        })
                        .pipe(dest);
                    }
                  );
                });
              }
            });
            zipfile.on("close", resolve);
            zipfile.on("error", (error) => {
              zipfile.close();
              reject(error);
            });
          } catch (zErr) {
            if (zipfile) {
              zipfile.close();
            }
            reject(zErr);
          }
        }
      );
    });
  }

  private static entryTooLargeError(fileName: string, maxSize: number): Error {
    return ValidationError(
      `${fileName} is too large - the maximum size is ${bytesToHumanReadable(
        maxSize
      )}`
    );
  }
}
