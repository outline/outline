import path from "path";
import fs from "fs-extra";
import JSZip from "jszip";
import tmp from "tmp";
import yauzl, { Entry, validateFileName } from "yauzl";
import { bytesToHumanReadable } from "@shared/utils/files";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import { trimFileAndExt } from "./fs";

const MAX_FILE_NAME_LENGTH = 255;
const MAX_PATH_LENGTH = 4096;

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
            .on("error", (rErr) => {
              dest.end();
              reject(rErr);
            })
            .pipe(dest);
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
              const fileName = Buffer.from(entry.fileName).toString("utf8");
              Logger.debug("utils", "Extracting zip entry", { fileName });

              if (validateFileName(fileName)) {
                Logger.warn("Invalid zip entry", { fileName });
                zipfile.readEntry();
              } else if (/\/$/.test(fileName)) {
                // directory file names end with '/'
                fs.mkdirp(
                  path.join(outputDir, fileName),
                  function (mErr: Error) {
                    if (mErr) {
                      return reject(mErr);
                    }
                    zipfile.readEntry();
                  }
                );
              } else {
                // file entry
                zipfile.openReadStream(entry, function (rErr, readStream) {
                  if (rErr) {
                    return reject(rErr);
                  }
                  // ensure parent directory exists
                  fs.mkdirp(
                    path.join(outputDir, path.dirname(fileName)),
                    function (mkErr) {
                      if (mkErr) {
                        return reject(mkErr);
                      }

                      const location = trimFileAndExt(
                        path.join(
                          outputDir,
                          trimFileAndExt(fileName, MAX_FILE_NAME_LENGTH)
                        ),
                        MAX_PATH_LENGTH
                      );
                      const dest = fs
                        .createWriteStream(location)
                        .on("error", reject);

                      readStream
                        .on("error", (rsErr) => {
                          dest.end();
                          reject(rsErr);
                        })
                        .on("end", function () {
                          zipfile.readEntry();
                        })
                        .pipe(dest);
                    }
                  );
                });
              }
            });
            zipfile.on("close", resolve);
            zipfile.on("error", reject);
          } catch (zErr) {
            reject(zErr);
          }
        }
      );
    });
  }
}
