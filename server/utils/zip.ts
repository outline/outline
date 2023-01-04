import path from "path";
import JSZip from "jszip";
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
      try {
        const img = await getFileByKey(attachment.key);
        if (img) {
          ZipHelper.addToArchive(zip, attachment.key, img as Blob, {
            createFolders: true,
          });
        }
      } catch (err) {
        Logger.error(
          `Failed to add attachment to archive: ${attachment.key}`,
          err
        );
      }

      text = text.replace(attachment.redirectUrl, encodeURI(attachment.key));
    }

    let title = serializeFilename(document.title) || "Untitled";

    const extension = format === FileOperationFormat.HTMLZip ? "html" : "md";

    title = ZipHelper.addToArchive(zip, `${title}.${extension}`, text, {
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

export async function addCollectionsToArchive(
  zip: JSZip,
  collections: Collection[],
  format: FileOperationFormat
) {
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
