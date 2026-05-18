import path from "node:path";
import fs from "fs-extra";
import type JSZip from "jszip";
import tmp from "tmp";
import type { Entry } from "yauzl";
import yauzl, { validateFileName } from "yauzl";
import { bytesToHumanReadable } from "@shared/utils/files";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import { trimFilenameAndExt } from "./fs";

const MAX_FILE_NAME_LENGTH = 255;

export interface ZipEntryHandle {
  /** UTF-8 filename as recorded in the zip; directory entries end with `/`. */
  fileName: string;
  /** True when this entry is a directory marker rather than a file. */
  isDirectory: boolean;
  /**
   * Read the entry's contents into memory. Safe to skip — entries the caller
   * does not read are simply advanced past.
   */
  readBuffer(): Promise<Buffer>;
}

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
   * Write a zip file to a temporary disk location
   *
   * @deprecated Use `extract` instead
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
        (err, filePath) => {
          if (err) {
            return reject(err);
          }

          let previousMetadata: JSZip.JSZipMetadata = {
            percent: 0,
            currentFile: null,
          };

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
            .on("error", handleError)
            .pipe(dest)
            .on("error", handleError);
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
   *                without calling `entry.readBuffer()`.
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
              isDirectory: /\/$/.test(fileName),
              readBuffer: () =>
                new Promise<Buffer>((res, rej) => {
                  zipfile.openReadStream(entry, (rErr, readStream) => {
                    if (rErr) {
                      return rej(rErr);
                    }
                    const chunks: Buffer[] = [];
                    readStream.on("data", (chunk: Buffer) =>
                      chunks.push(chunk)
                    );
                    readStream.on("end", () => res(Buffer.concat(chunks)));
                    readStream.on("error", rej);
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

              if (/\/$/.test(filePath)) {
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
}
