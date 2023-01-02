import path from "path";
import JSZip, { JSZipObject } from "jszip";
import { FileOperationFormat } from "@shared/types";
import Logger from "@server/logging/Logger";
import Attachment from "@server/models/Attachment";
import Collection from "@server/models/Collection";
import Document from "@server/models/Document";
import DocumentHelper from "@server/models/helpers/DocumentHelper";
import { NavigationNode } from "~/types";
import ZipHelper from "./ZipHelper";
import { serializeFilename } from "./fs";
import parseAttachmentIds from "./parseAttachmentIds";
import { getFileByKey } from "./s3";

type ItemType = "collection" | "document" | "attachment";

export type Item = {
  path: string;
  dir: string;
  name: string;
  depth: number;
  metadata: Record<string, any>;
  type: ItemType;
  item: JSZipObject;
};

export type FileTreeNode = {
  /** The title, extracted from the file name */
  title: string;
  /** The file name including extension */
  name: string;
  /** The full path to within the zip file */
  path: string;
  /** The nested children */
  children: FileTreeNode[];
};

async function addDocumentTreeToArchive(
  zip: JSZip,
  documents: NavigationNode[],
  format = FileOperationFormat.MarkdownZip
) {
  for (const doc of documents) {
    const document = await Document.findByPk(doc.id);

    if (!document) {
      continue;
    }

    let text =
      format === FileOperationFormat.HTMLZip
        ? await DocumentHelper.toHTML(document, { centered: true })
        : await DocumentHelper.toMarkdown(document);
    const attachments = await Attachment.findAll({
      where: {
        teamId: document.teamId,
        id: parseAttachmentIds(document.text),
      },
    });

    for (const attachment of attachments) {
      await addImageToArchive(zip, attachment.key);
      text = text.replace(attachment.redirectUrl, encodeURI(attachment.key));
    }

    let title = serializeFilename(document.title) || "Untitled";

    const extension = format === FileOperationFormat.HTMLZip ? "html" : "md";

    title = ZipHelper.safeAddToArchive(zip, `${title}.${extension}`, text, {
      date: document.updatedAt,
      comment: JSON.stringify({
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      }),
    });

    if (doc.children && doc.children.length) {
      const folder = zip.folder(path.parse(title).name);

      if (folder) {
        await addDocumentTreeToArchive(folder, doc.children, format);
      }
    }
  }
}

/**
 * Adds the content of a file in remote storage to the given zip file.
 *
 * @param zip JSZip object to add to
 * @param key path to file in S3 storage
 */
async function addImageToArchive(zip: JSZip, key: string) {
  try {
    const img = await getFileByKey(key);

    // @ts-expect-error Blob
    zip.file(key, img, {
      createFolders: true,
    });
  } catch (err) {
    Logger.error("Error loading image attachment from S3", err, {
      key,
    });
  }
}

export async function archiveCollections(
  collections: Collection[],
  format: FileOperationFormat
) {
  const zip = new JSZip();

  for (const collection of collections) {
    if (collection.documentStructure) {
      const folder = zip.folder(serializeFilename(collection.name));

      if (folder) {
        await addDocumentTreeToArchive(
          folder,
          collection.documentStructure,
          format
        );
      }
    }
  }

  return ZipHelper.toTmpFile(zip);
}
