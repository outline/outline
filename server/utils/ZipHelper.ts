import path from "node:path";
import { pipeline } from "node:stream/promises";
import fs from "fs-extra";
import tmp from "tmp";
import type { Entry } from "yauzl";
import yauzl, { validateFileName } from "yauzl";
import { ZipFile } from "yazl";
import { bytesToHumanReadable } from "@shared/utils/files";
import { ValidationError } from "@server/errors";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import { deserializeFilename } from "./fs";

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
   * Entries are added by the `addEntries` callback, which receives an archive
   * that is already draining to disk. Adding entries only after a reader is
   * attached keeps memory proportional to a single entry rather than to the
   * size of the whole archive.
   *
   * @param addEntries Callback that populates the archive.
   * @returns pathname of the temporary file where the zip was written to disk.
   * @throws if the archive could not be built or written to disk.
   */
  public static async toTmpFile(
    addEntries: (zip: ZipFile) => Promise<void>
  ): Promise<string> {
    Logger.debug("utils", "Creating tmp file…");
    const filePath = await createTmpFile({
      prefix: "export-",
      postfix: ".zip",
    });

    const zip = new ZipFile();
    const writeStream = fs.createWriteStream(filePath);
    // yazl reports failures on the archive rather than on its output stream,
    // so route them into the pipeline to get a single failure path.
    zip.on("error", (error: Error) => writeStream.destroy(error));

    const writing = pipeline(zip.outputStream, writeStream);
    // Resolve rather than reject, so that a write failure while entries are
    // still being added is never an unhandled rejection.
    const written = writing.then(
      () => undefined,
      (error: Error) => error
    );

    try {
      await addEntries(zip);
      zip.end();
    } catch (error) {
      // Unblock the pipeline, which is still waiting on entries that will now
      // never arrive.
      writeStream.destroy();
      await written;
      await removeTmpFile(filePath);
      throw error;
    }

    const writeError = await written;
    if (writeError) {
      await removeTmpFile(filePath);
      throw writeError;
    }

    Logger.debug("utils", "Writing zip complete", { path: filePath });
    return filePath;
  }

  /**
   * Iterate through entries in a zip file without extracting it to disk.
   * Entries are visited serially in archive order. `onEntry` may be async; the
   * next entry is only read once the previous handler resolves.
   *
   * @param source The file path where the zip is located, or a Buffer holding
   *               the zip contents already in memory.
   * @param onEntry Handler invoked for each entry. Skip an entry by returning
   *                without calling `entry.readBuffer(maxSize)`.
   * @returns Promise that resolves once the archive has been fully walked.
   */
  public static walk(
    source: string | Buffer,
    onEntry: (entry: ZipEntryHandle) => Promise<void> | void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        lazyEntries: true,
        autoClose: true,
        decodeStrings: false,
      };

      const onOpen = function (
        err: Error | null,
        zipfile: yauzl.ZipFile
      ): void {
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

        const done = () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        };

        // A file-backed archive resolves on "close", so that its descriptor is
        // released before the caller gets control back and can delete the file.
        // A buffer-backed one has no descriptor and yauzl's BufferSlicer never
        // emits "close", so "end" — every entry read — is the only signal.
        if (typeof source === "string") {
          zipfile.on("close", done);
        } else {
          zipfile.on("end", done);
        }

        zipfile.on("error", (error) => fail(error));
        zipfile.readEntry();
      };

      if (typeof source === "string") {
        yauzl.open(source, options, onOpen);
      } else {
        yauzl.fromBuffer(source, options, onOpen);
      }
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

  private static entryTooLargeError(fileName: string, maxSize: number): Error {
    return ValidationError(
      `${fileName} is too large - the maximum size is ${bytesToHumanReadable(
        maxSize
      )}`
    );
  }
}

/**
 * Promisified wrapper around tmp.file.
 *
 * The descriptor tmp opens is discarded, as the file is written through a
 * separate stream — retaining it would leak a descriptor per call.
 *
 * @param options options passed through to tmp.
 * @returns the path of the created temporary file.
 */
const createTmpFile = (options: tmp.FileOptions) =>
  new Promise<string>((resolve, reject) => {
    tmp.file({ ...options, discardDescriptor: true }, (err, filePath) =>
      err ? reject(err) : resolve(filePath)
    );
  });

/**
 * Delete a temporary file, logging rather than throwing on failure.
 *
 * @param filePath the path of the file to remove.
 */
const removeTmpFile = (filePath: string) =>
  fs.remove(filePath).catch((error) => {
    Logger.error("Failed to remove tmp file", error);
  });
