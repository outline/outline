import fs from "fs";
import JSZip from "jszip";
import tmp from "tmp";
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
}
