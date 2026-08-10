import path from "node:path";
import env from "@server/env";
import type Document from "@server/models/Document";
import { serializeFilename } from "@server/utils/fs";

/**
 * Helpers for writing documents in the TextBundle format, a directory holding
 * a document's text alongside the files it references.
 *
 * @see https://textbundle.org/spec/
 */
export default class TextBundleHelper {
  /**
   * Name of a bundle's text entry. Markdown is the format's default type, so
   * the extension is the conventional one rather than a choice.
   */
  public static readonly textFileName = "text.markdown";

  /** Name of a bundle's metadata entry. */
  public static readonly infoFileName = "info.json";

  /** Directory a bundle's referenced files live in. */
  public static readonly assetsDirectory = "assets";

  /** Extension of a bundle directory, without a leading dot. */
  public static readonly bundleExtension = "textbundle";

  /** Extension of a zipped bundle, without a leading dot. */
  public static readonly packExtension = "textpack";

  /**
   * Builds the metadata entry that identifies a directory as a TextBundle.
   *
   * @param document The document the bundle was built from.
   * @param revisionId The revision the bundle was built from, if not the
   * current version of the document.
   * @returns The contents of the bundle's info.json.
   */
  public static info(document: Document, revisionId?: string): string {
    const documentURL = `${env.URL}${document.url}`;

    return JSON.stringify(
      {
        version: 2,
        type: "net.daringfireball.markdown",
        transient: false,
        creatorIdentifier: "com.getoutline.outline",
        creatorURL: env.URL,
        sourceURL: revisionId
          ? `${documentURL}/history/${revisionId}`
          : documentURL,
      },
      null,
      2
    );
  }

  /**
   * Resolves a name for an asset that is safe as a path component and unique
   * within a single bundle, since two attachments on one document may share an
   * original file name.
   *
   * @param name The attachment's original file name.
   * @param used Names already taken within this bundle, added to in place.
   * @returns The path of the asset relative to the bundle's text file.
   */
  public static assetPath(name: string, used: Set<string>): string {
    const serialized = serializeFilename(path.basename(name));
    const { name: base, ext } = path.parse(serialized);

    let candidate = base ? serialized : "file";
    let i = 0;
    while (used.has(candidate)) {
      candidate = `${base || "file"} (${++i})${ext}`;
    }

    used.add(candidate);
    return path.join(this.assetsDirectory, candidate);
  }
}
