import path from "path";
import JSZip from "jszip";
import { FileOperationFormat, NavigationNode } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Collection } from "@server/models";
import Attachment from "@server/models/Attachment";
import Document from "@server/models/Document";
import DocumentHelper from "@server/models/helpers/DocumentHelper";
import ZipHelper from "@server/utils/ZipHelper";
import { serializeFilename } from "@server/utils/fs";
import parseAttachmentIds from "@server/utils/parseAttachmentIds";
import ExportTask from "./ExportTask";

export default abstract class ExportDocumentTreeTask extends ExportTask {
  /**
   * Exports the document tree to the given zip instance.
   *
   * @param zip The JSZip instance to add files to
   * @param documentId The document ID to export
   * @param pathInZip The path in the zip to add the document to
   * @param format The format to export in
   */
  protected async addDocumentToArchive({
    zip,
    pathInZip,
    documentId,
    format = FileOperationFormat.MarkdownZip,
    pathMap,
  }: {
    zip: JSZip;
    pathInZip: string;
    documentId: string;
    format: FileOperationFormat;
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
        : await DocumentHelper.toMarkdown(document);

    const attachmentIds = parseAttachmentIds(document.text);
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
    await Promise.all(
      attachments.map(async (attachment) => {
        try {
          Logger.debug("task", `Adding attachment to archive`, {
            documentId,
            key: attachment.key,
          });

          const dir = path.dirname(pathInZip);
          zip.file(path.join(dir, attachment.key), attachment.buffer, {
            date: attachment.updatedAt,
            createFolders: true,
          });
        } catch (err) {
          Logger.error(
            `Failed to add attachment to archive: ${attachment.key}`,
            err
          );
        }

        text = text.replace(attachment.redirectUrl, encodeURI(attachment.key));
      })
    );

    // Replace any internal links with relative paths to the document in the zip
    const internalLinks = [
      ...text.matchAll(/\/doc\/(?:[0-9a-zA-Z-_~]*-)?([a-zA-Z0-9]{10,15})/g),
    ];
    internalLinks.forEach((match) => {
      const matchedLink = match[0];
      const matchedDocPath = pathMap.get(matchedLink);

      if (matchedDocPath) {
        const relativePath = path.relative(pathInZip, matchedDocPath);
        if (relativePath.startsWith(".")) {
          text = text.replace(
            matchedLink,
            encodeURI(relativePath.substring(1))
          );
        }
      }
    });

    // Finally, add the document to the zip file
    zip.file(pathInZip, text, {
      date: document.updatedAt,
      createFolders: true,
      comment: JSON.stringify({
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      }),
    });
  }

  /**
   * Exports the documents and attachments in the given collections to a zip file
   * and returns the path to the zip file in tmp.
   *
   * @param zip The JSZip instance to add files to
   * @param collections The collections to export
   * @param format The format to export in
   *
   * @returns The path to the zip file in tmp.
   */
  protected async addCollectionsToArchive(
    zip: JSZip,
    collections: Collection[],
    format: FileOperationFormat
  ) {
    const pathMap = this.createPathMap(collections, format);
    Logger.debug(
      "task",
      `Start adding ${Object.values(pathMap).length} documents to archive`
    );

    for (const path of pathMap) {
      const documentId = path[0].replace("/doc/", "");
      const pathInZip = path[1];

      await this.addDocumentToArchive({
        zip,
        pathInZip,
        documentId,
        format,
        pathMap,
      });
    }

    Logger.debug("task", "Completed adding documents to archive");

    return await ZipHelper.toTmpFile(zip);
  }

  /**
   * Generates a map of document urls to their path in the zip file.
   *
   * @param collections
   */
  private createPathMap(
    collections: Collection[],
    format: FileOperationFormat
  ) {
    const map = new Map<string, string>();

    for (const collection of collections) {
      if (collection.documentStructure) {
        this.addDocumentTreeToPathMap(
          map,
          collection.documentStructure,
          serializeFilename(collection.name),
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
      const extension = format === FileOperationFormat.HTMLZip ? "html" : "md";

      // Ensure the document is given a unique path in zip, even if it has
      // the same title as another document in the same collection.
      let i = 0;
      let filePath = path.join(root, `${title}.${extension}`);
      while (Array.from(map.values()).includes(filePath)) {
        filePath = path.join(root, `${title} (${++i}).${extension}`);
      }

      map.set(node.url, filePath);

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
