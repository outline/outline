import mime from "mime-types";
import { AttachmentPreset } from "@shared/types";
import { replaceMarkdownLinks } from "@shared/utils/markdown";
import { DocumentValidation } from "@shared/validations";
import { FileImportError } from "@server/errors";
import Logger from "@server/logging/Logger";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";
import TextBundleHelper from "@server/models/helpers/TextBundleHelper";
import ZipHelper from "@server/utils/ZipHelper";
import { BaseConverter } from "./BaseConverter";

/** Matches a TextBundle's text entry, whose extension the spec leaves open. */
const TEXTBUNDLE_TEXT_REGEX = /^text\.[^.]+$/;

/**
 * Extensions of a TextBundle text entry that can be read as markdown. The spec
 * allows any extension and declares the real content type in info.json, so this
 * is only consulted for bundles that omit a type.
 */
const TEXTBUNDLE_TEXT_EXTENSIONS = [
  "markdown",
  "markdn",
  "mdown",
  "mmd",
  "md",
  "text",
  "txt",
];

/** UTIs from info.json whose content can be read as markdown or plain text. */
const TEXTBUNDLE_TEXT_TYPES = [
  "net.daringfireball.markdown",
  "public.plain-text",
  "public.utf8-plain-text",
  "public.text",
];

/**
 * Media types that can be inlined as a data URI. Markdown-it rejects a `data:`
 * destination outside this set, and an asset it rejects would be left in the
 * document as literal base64 text, so anything else keeps its original
 * reference instead.
 */
const TEXTBUNDLE_EMBEDDABLE_MIME_TYPES = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
];

/** Maximum number of entries a TextPack archive may contain. */
const TEXTBUNDLE_MAX_ENTRIES = 2000;

/** Maximum size of the bundle's info.json, in bytes. */
const TEXTBUNDLE_MAX_INFO_SIZE = 1024 * 1024;

/** Maximum size of the bundle's text file, in bytes. */
const TEXTBUNDLE_MAX_TEXT_SIZE = DocumentValidation.maxStateLength;

/**
 * Ceiling on the size of a single asset inlined as a data URI, in bytes. The
 * configured attachment limit bounds this too, but on its own it is not enough:
 * it can be set arbitrarily high, whereas inlining holds the asset in memory
 * several times over.
 */
const TEXTBUNDLE_MAX_ASSET_SIZE = 15 * 1024 * 1024;

/** Maximum combined size of all assets, in bytes. */
const TEXTBUNDLE_MAX_TOTAL_ASSETS_SIZE = 50 * 1024 * 1024;

interface TextBundleEntry {
  fileName: string;
  isDirectory: boolean;
}

interface TextBundleRoot {
  /** Path prefix of the bundle's contents within the zip, "" if not nested in a wrapper folder. */
  root: string;
  /** Full path of the text entry within the zip. */
  textPath: string;
  /** Full path of the bundle's info.json, if it has one. */
  infoPath?: string;
}

/**
 * Converts a TextPack — the zipped form of a TextBundle — to markdown.
 *
 * @see https://textbundle.org/spec/
 */
export class TextPackConverter extends BaseConverter {
  /**
   * Convert a TextPack (a zipped TextBundle) to markdown, embedding referenced
   * assets as base64 data URIs so they survive as ordinary markdown images
   * until {@link ProsemirrorHelper.replaceImagesWithAttachments} turns them
   * into real attachments. Assets of a type that cannot be inlined keep their
   * original reference.
   *
   * @param content The TextPack file content as a Buffer.
   * @returns The bundle's text content as markdown, with assets embedded.
   * @throws {FileImportError} if the archive is malformed, oversized, holds no
   *   text file, or declares a format that cannot be read as markdown.
   */
  public static async toMarkdown(content: Buffer | string): Promise<string> {
    if (!(content instanceof Buffer)) {
      throw FileImportError("Unsupported TextPack file");
    }

    const entries: TextBundleEntry[] = [];

    await ZipHelper.walk(content, (entry) => {
      entries.push({
        fileName: entry.fileName,
        isDirectory: entry.isDirectory,
      });
      if (entries.length > TEXTBUNDLE_MAX_ENTRIES) {
        throw FileImportError("TextPack file contains too many entries");
      }
    });

    const bundle = this.findTextBundleRoot(entries);
    if (!bundle) {
      throw FileImportError(
        "TextPack file does not contain a recognizable text file"
      );
    }

    const rootPrefix = bundle.root ? `${bundle.root}/` : "";
    // Compared case-insensitively: the spec only recommends lowercase names.
    const assetPrefix =
      `${rootPrefix}${TextBundleHelper.assetsDirectory}/`.toLowerCase();
    // Keyed on the lowercased path for the same reason; TextBundle is designed
    // for case-insensitive filesystems, so two assets differing only in case
    // cannot coexist in a valid bundle.
    const assets = new Map<string, string>();
    // Each asset becomes an attachment downstream, so anything the attachment
    // pipeline would reject is not worth inlining as a data URI first.
    const maxAssetSize = Math.min(
      TEXTBUNDLE_MAX_ASSET_SIZE,
      AttachmentHelper.presetToMaxUploadSize(
        AttachmentPreset.DocumentAttachment
      )
    );
    let markdown: string | undefined;
    let info: string | undefined;
    let totalAssetBytes = 0;

    await ZipHelper.walk(content, async (entry) => {
      if (entry.isDirectory) {
        return;
      }

      if (entry.fileName === bundle.textPath) {
        const buffer = await entry.readBuffer(TEXTBUNDLE_MAX_TEXT_SIZE);
        markdown = buffer.toString("utf8");
        return;
      }

      if (entry.fileName === bundle.infoPath) {
        const buffer = await entry.readBuffer(TEXTBUNDLE_MAX_INFO_SIZE);
        info = buffer.toString("utf8");
        return;
      }

      if (!entry.fileName.toLowerCase().startsWith(assetPrefix)) {
        return;
      }

      const relativePath = entry.fileName.slice(rootPrefix.length);
      const assetMimeType =
        mime.lookup(relativePath) || "application/octet-stream";

      if (!TEXTBUNDLE_EMBEDDABLE_MIME_TYPES.includes(assetMimeType)) {
        Logger.info(
          "utils",
          `Skipping TextPack asset of unembeddable type ${assetMimeType}`
        );
        return;
      }

      const buffer = await entry.readBuffer(maxAssetSize);

      // Checked against the actual decompressed size, not the archive's
      // (attacker-controlled) declared size, so this also bounds the total
      // work done for a bundle of many small-but-lying entries.
      totalAssetBytes += buffer.length;
      if (totalAssetBytes > TEXTBUNDLE_MAX_TOTAL_ASSETS_SIZE) {
        throw FileImportError(
          "TextPack file assets exceed the maximum combined size"
        );
      }

      assets.set(
        relativePath.toLowerCase(),
        `data:${assetMimeType};base64,${buffer.toString("base64")}`
      );
    });

    if (markdown === undefined) {
      throw FileImportError(
        "TextPack file does not contain a recognizable text file"
      );
    }

    this.assertTextBundleIsText(bundle.textPath, info);

    markdown = this.embedTextBundleAssets(markdown, assets);

    return this.processFrontmatter(markdown);
  }

  /**
   * Locate a TextBundle's text file within a zip's entries, tolerant of the
   * bundle either being wrapped in a `*.textbundle` directory or zipped flat.
   * The spec leaves the text entry's extension open, so any `text.*` matches.
   *
   * @param entries The zip's entries.
   * @returns The bundle's root path prefix, text entry path and info.json path,
   *   or null if no recognizable text file was found.
   */
  private static findTextBundleRoot(
    entries: TextBundleEntry[]
  ): TextBundleRoot | null {
    const isVisible = (segments: string[]) =>
      !segments.some(
        (segment) => segment === "__MACOSX" || segment.startsWith(".")
      );

    let best:
      | (TextBundleRoot & { depth: number; knownExtension: boolean })
      | null = null;
    let candidates = 0;

    for (const entry of entries) {
      if (entry.isDirectory) {
        continue;
      }

      const segments = entry.fileName.split("/").filter(Boolean);
      if (!isVisible(segments)) {
        continue;
      }

      const name = segments[segments.length - 1].toLowerCase();
      if (!TEXTBUNDLE_TEXT_REGEX.test(name)) {
        continue;
      }

      candidates++;

      // Prefer the shallowest bundle, and among equals the one whose extension
      // we already know how to read, so a `text.md` beside a `text.fountain`
      // wins without needing info.json.
      const depth = segments.length;
      const knownExtension = TEXTBUNDLE_TEXT_EXTENSIONS.includes(
        name.slice("text.".length)
      );

      if (
        !best ||
        depth < best.depth ||
        (depth === best.depth && knownExtension && !best.knownExtension)
      ) {
        best = {
          root: segments.slice(0, -1).join("/"),
          textPath: entry.fileName,
          depth,
          knownExtension,
        };
      }
    }

    if (!best) {
      return null;
    }

    if (candidates > 1) {
      Logger.warn(
        "TextPack contains more than one text file, importing the first bundle only",
        { candidates }
      );
    }

    const rootPrefix = best.root ? `${best.root}/` : "";
    const infoPath = entries.find(
      (entry) =>
        !entry.isDirectory &&
        entry.fileName.toLowerCase() ===
          `${rootPrefix}${TextBundleHelper.infoFileName}`.toLowerCase()
    )?.fileName;

    return { root: best.root, textPath: best.textPath, infoPath };
  }

  /**
   * Assert that a TextBundle holds markdown or plain text rather than another
   * format such as RTF. The bundle's declared `type` is authoritative; when it
   * is absent the text entry's extension is used instead.
   *
   * @param textPath Path of the bundle's text entry within the zip.
   * @param info Raw contents of the bundle's info.json, if it has one.
   * @throws {FileImportError} if the bundle declares a format we cannot read.
   */
  private static assertTextBundleIsText(
    textPath: string,
    info: string | undefined
  ): void {
    let type: string | undefined;

    if (info) {
      try {
        const parsed: unknown = JSON.parse(info);
        if (
          parsed &&
          typeof parsed === "object" &&
          "type" in parsed &&
          typeof parsed.type === "string"
        ) {
          type = parsed.type.toLowerCase();
        }
      } catch (_err) {
        // A malformed info.json falls back to the extension check below.
      }
    }

    if (type) {
      if (
        !TEXTBUNDLE_TEXT_TYPES.includes(type) &&
        !type.includes("markdown") &&
        !type.includes("plain-text")
      ) {
        throw FileImportError(
          `TextPack file contains ${type} content, which cannot be imported`
        );
      }
      return;
    }

    const extension = textPath.split(".").pop()?.toLowerCase() ?? "";
    if (!TEXTBUNDLE_TEXT_EXTENSIONS.includes(extension)) {
      throw FileImportError(
        `TextPack file contains a .${extension} text file, which cannot be imported`
      );
    }
  }

  /**
   * Replace TextBundle asset references (e.g. `![](assets/image.png)`) in
   * markdown with their base64 data URI, resolving relative and
   * percent-encoded links.
   *
   * @param markdown The bundle's markdown text.
   * @param assets Map of lowercased asset path (relative to the bundle root)
   *   to data URI.
   * @returns The markdown with recognized asset links replaced.
   */
  private static embedTextBundleAssets(
    markdown: string,
    assets: Map<string, string>
  ): string {
    return replaceMarkdownLinks(markdown, (href) => {
      let key = href.replace(/^\.\//, "");
      try {
        key = decodeURIComponent(key);
      } catch {
        // Leave as-is if not validly percent-encoded.
      }

      return assets.get(key.toLowerCase());
    });
  }
}
