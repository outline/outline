import path from "path";
import fs from "fs-extra";
import JSZip from "jszip";
import tmp from "tmp";
import yauzl from "yauzl";
import { bytesToHumanReadable } from "@shared/utils/files";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";

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
        { lazyEntries: true, autoClose: true },
        function (err, zipfile) {
          if (err) {
            return reject(err);
          }
          try {
            zipfile.readEntry();
            zipfile.on("entry", function (entry) {
              Logger.debug("utils", "Extracting zip entry", entry);
              if (/\/$/.test(entry.fileName)) {
                // directory file names end with '/'
                fs.mkdirp(
                  path.join(outputDir, entry.fileName),
                  function (err: Error) {
                    if (err) {
                      throw err;
                    }
                    zipfile.readEntry();
                  }
                );
              } else {
                // file entry
                zipfile.openReadStream(entry, function (err, readStream) {
                  if (err) {
                    throw err;
                  }
                  // ensure parent directory exists
                  fs.mkdirp(
                    path.join(outputDir, path.dirname(entry.fileName)),
                    function (err) {
                      if (err) {
                        throw err;
                      }
                      readStream.pipe(
                        fs.createWriteStream(
                          path.join(outputDir, entry.fileName)
                        )
                      );
                      readStream.on("end", function () {
                        zipfile.readEntry();
                      });
                      readStream.on("error", (err) => {
                        throw err;
                      });
                    }
                  );
                });
              }
            });
            zipfile.on("close", resolve);
            zipfile.on("error", reject);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }
}
