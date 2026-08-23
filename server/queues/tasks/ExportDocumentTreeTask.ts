import path from "node:path";
import { escapeRegExp } from "es-toolkit/compat";
import type { ZipFile } from "yazl";
import { errToString } from "@shared/utils/error";
import type { NavigationNode } from "@shared/types";
import { FileOperationFormat } from "@shared/types";
import Logger from "@server/logging/Logger";
import type { Collection } from "@server/models";
import Attachment from "@server/models/Attachment";
import Document from "@server/models/Document";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import HTMLHelper from "@server/models/helpers/HTMLHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import TextBundleHelper from "@server/models/helpers/TextBundleHelper";
import ZipHelper from "@server/utils/ZipHelper";
import { serializeFilename } from "@server/utils/fs";
import ExportTask from "./ExportTask";

export default abstract class ExportDocumentTreeTask extends ExportTask {
  /**
   * The extension given to each document's entry in the archive. For TextBundle
   * this names a directory rather than a file.
   *
   * @param format The format being exported.
   * @returns The extension, without a leading dot.
   */
  private static extensionForFormat(format: FileOperationFormat): string {
    switch (format) {
      case FileOperationFormat.HTMLZip:
        return "html";
      case FileOperationFormat.TextBundleZip:
        return TextBundleHelper.bundleExtension;
      default:
        return "md";
    }
  }

  /**
   * Exports the document tree to the given zip instance.
   *
   * @param zip The yazl ZipFile to add files to
   * @param documentId The document ID to export
   * @param pathInZip The path in the zip to add the document to. For TextBundle
   *   this is the bundle directory rather than a file.
   * @param format The format to export in
   */
  protected async processDocument({
    zip,
    pathInZip,
    documentId,
    format,
    includeAttachments,
    pathMap,
  }: {
    zip: ZipFile;
    pathInZip: string;
    documentId: string;
    format: FileOperationFormat;
    includeAttachments: boolean;
    pathMap: Map<string, string>;
  }) {
    Logger.debug("task", `Adding document to archive`, { documentId });
    const document = await Document.findByPk(documentId);
    if (!document) {
      return;
    }

    let text =
      format === FileOperationFormat.HTMLZip
        ? await DocumentHelper.toHTML(document, { centered: true })
        : await DocumentHelper.toMarkdown(document, { commonMark: true });

    const isTextBundle = format === FileOperationFormat.TextBundleZip;

    // A TextBundle is a directory, so its text and assets sit inside the path
    // reserved for the document rather than beside it.
    const textPathInZip = isTextBundle
      ? path.join(pathInZip, TextBundleHelper.textFileName)
      : pathInZip;
    const usedAssetNames = new Set<string>();

    const attachmentIds = includeAttachments
      ? ProsemirrorHelper.parseAttachmentIds(
          DocumentHelper.toProsemirror(document)
        )
      : [];
    const attachments = attachmentIds.length
      ? await Attachment.findAll({
          where: {
            teamId: document.teamId,
            id: attachmentIds,
          },
        })
      : [];

    // Add any referenced attachments to the zip file and replace the
    // reference in the document with the path to the attachment in the zip
    for (const attachment of attachments) {
      Logger.debug("task", `Adding attachment to archive`, {
        documentId,
        key: attachment.key,
      });

      // Skip attachments with a malformed key that has no filename component,
      // as yazl rejects entries whose path ends with a slash.
      if (!attachment.key || attachment.key.endsWith("/")) {
        Logger.warn(`Skipping attachment with invalid key`, {
          attachmentId: attachment.id,
          teamId: attachment.teamId,
          key: attachment.key,
        });
        continue;
      }

      const dir = path.dirname(pathInZip);

      // Inline small images referenced a single time as base64 data URIs
      // rather than writing an external file. PDF export renders from HTML too.
      // Only these are read into memory; the rest are streamed into the archive.
      if (
        (format === FileOperationFormat.HTMLZip ||
          format === FileOperationFormat.PDF) &&
        HTMLHelper.canInlineImage(
          text,
          attachment.redirectUrl,
          attachment.contentType,
          attachment.size
        )
      ) {
        let buffer: Buffer | undefined;
        try {
          buffer = await attachment.buffer;
        } catch (err) {
          Logger.warn(`Failed to read attachment from storage`, {
            attachmentId: attachment.id,
            teamId: attachment.teamId,
            error: errToString(err),
          });
        }

        const inlined = buffer
          ? HTMLHelper.inlineImage(
              text,
              attachment.redirectUrl,
              attachment.contentType,
              buffer
            )
          : null;
        if (inlined !== null) {
          text = inlined;
          continue;
        }
      }

      // TextBundle requires assets to live in the bundle's own assets folder,
      // referenced relative to the text file, rather than at their storage key.
      const reference = isTextBundle
        ? TextBundleHelper.assetPath(attachment.name, usedAssetNames)
        : attachment.key;

      this.addAttachmentToArchive(
        zip,
        attachment,
        isTextBundle
          ? path.join(pathInZip, reference)
          : path.join(dir, reference)
      );

      text = text.replace(
        new RegExp(escapeRegExp(attachment.redirectUrl), "g"),
        encodeURI(reference)
      );
    }

    // Replace any internal links with relative paths to the document in the zip
    const internalLinks = [
      ...text.matchAll(/\/doc\/(?:[0-9a-zA-Z-_~]*-)?([a-zA-Z0-9]{10,15})/g),
    ];
    internalLinks.forEach((match) => {
      const matchedLink = match[0];
      const matchedDocPath = pathMap.get(matchedLink);

      if (matchedDocPath) {
        const relativePath = path.relative(textPathInZip, matchedDocPath);
        if (relativePath.startsWith(".")) {
          text = text.replace(
            matchedLink,
            encodeURI(relativePath.substring(1))
          );
        }
      }
    });

    if (isTextBundle) {
      zip.addBuffer(
        Buffer.from(TextBundleHelper.info(document)),
        path.join(pathInZip, TextBundleHelper.infoFileName),
        { mtime: document.updatedAt }
      );
    }

    // Finally, add the document to the zip file
    zip.addBuffer(Buffer.from(text), textPathInZip, {
      mtime: document.updatedAt,
      fileComment: JSON.stringify({
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      }),
    });
  }

  /**
   * Exports the documents and attachments in the given collections to a zip file
   * and returns the path to the zip file in tmp.
   *
   * @param zip The yazl ZipFile to add files to
   * @param collections The collections to export
   * @param format The format to export in
   * @param includeAttachments Whether to include attachments in the export
   *
   * @returns The path to the zip file in tmp.
   */
  protected async addCollectionsToArchive(
    collections: Collection[],
    format: FileOperationFormat,
    includeAttachments = true
  ) {
    const pathMap = this.createPathMap(collections, format);
    return await ZipHelper.toTmpFile((zip) =>
      this.addDocumentsToArchive({
        zip,
        pathMap,
        format,
        includeAttachments,
      })
    );
  }

  protected async addDocumentToArchive({
    document,
    format,
    documentStructure,
    includeAttachments = true,
  }: {
    document: Document;
    format: FileOperationFormat;
    documentStructure: NavigationNode[];
    includeAttachments?: boolean;
  }) {
    const pathMap = new Map<string, string>();

    const rootFolderName = serializeFilename(document.titleWithDefault);

    // entry for root document
    pathMap.set(
      document.path,
      `${rootFolderName}.${ExportDocumentTreeTask.extensionForFormat(format)}`
    );

    this.addDocumentTreeToPathMap(
      pathMap,
      documentStructure,
      serializeFilename(document.titleWithDefault),
      format
    );

    return await ZipHelper.toTmpFile((zip) =>
      this.addDocumentsToArchive({
        zip,
        pathMap,
        format,
        includeAttachments,
      })
    );
  }

  /**
   * Processes each unique document in the path map and adds it to the zip.
   *
   * @param zip The yazl ZipFile to add files to
   * @param pathMap Map of document urls to their path in the zip
   * @param format The format to export in
   * @param includeAttachments Whether to include attachments in the export
   */
  private async addDocumentsToArchive({
    zip,
    pathMap,
    format,
    includeAttachments,
  }: {
    zip: ZipFile;
    pathMap: Map<string, string>;
    format: FileOperationFormat;
    includeAttachments: boolean;
  }) {
    const processedPaths = new Set<string>();

    Logger.debug("task", `Start adding documents to archive`);

    for (const [url, pathInZip] of pathMap) {
      // A document may be keyed by multiple urls in the path map, only
      // process each file in the zip once.
      if (processedPaths.has(pathInZip)) {
        continue;
      }
      processedPaths.add(pathInZip);

      await this.processDocument({
        zip,
        pathInZip,
        documentId: url.replace("/doc/", ""),
        includeAttachments,
        format,
        pathMap,
      });
    }

    Logger.debug("task", "Completed adding documents to archive");
  }

  /**
   * Generates a map of document urls to their path in the zip file.
   *
   * @param collections The collections to generate the path map for.
   * @param format The format of the exported documents.
   */
  private createPathMap(
    collections: Collection[],
    format: FileOperationFormat
  ) {
    const map = new Map<string, string>();
    const usedRoots = new Set<string>();

    for (const collection of collections) {
      if (collection.documentStructure) {
        let root = serializeFilename(collection.name);
        let i = 0;
        while (usedRoots.has(root)) {
          root = `${serializeFilename(collection.name)} (${++i})`;
        }
        usedRoots.add(root);

        this.addDocumentTreeToPathMap(
          map,
          collection.documentStructure,
          root,
          format
        );
      }
    }

    return map;
  }

  private addDocumentTreeToPathMap(
    map: Map<string, string>,
    nodes: NavigationNode[],
    root: string,
    format: FileOperationFormat
  ) {
    for (const node of nodes) {
      const title = serializeFilename(node.title) || "Untitled";
      const extension = ExportDocumentTreeTask.extensionForFormat(format);

      // Ensure the document is given a unique path in zip, even if it has
      // the same title as another document in the same collection.
      let i = 0;
      let filePath = path.join(root, `${title}.${extension}`);
      while (Array.from(map.values()).includes(filePath)) {
        filePath = path.join(root, `${title} (${++i}).${extension}`);
      }

      map.set(node.url, filePath);

      // If this is an imported document, the references to this doc are in the 'doc/{docId}' format.
      // Set this format to replace them with relative URLs in the zip.
      map.set(`/doc/${node.id}`, filePath);

      if (node.children?.length) {
        this.addDocumentTreeToPathMap(
          map,
          node.children,
          path.join(root, title),
          format
        );
      }
    }
  }
}
