import fs from "fs";
import JSZip from "jszip";
import tmp from "tmp";
import Logger from "@server/logging/logger";
import { Attachment, Collection, Document } from "@server/models";
import { NavigationNode } from "~/types";
import { serializeFilename } from "./fs";
import { getFileByKey } from "./s3";

async function addToArchive(zip: JSZip, documents: NavigationNode[]) {
  for (const doc of documents) {
    const document = await Document.findByPk(doc.id);

    if (!document) {
      continue;
    }

    let text = document.toMarkdown();
    const attachments = await Attachment.findAll({
      where: {
        documentId: document.id,
      },
    });

    for (const attachment of attachments) {
      await addImageToArchive(zip, attachment.key);
      text = text.replace(attachment.redirectUrl, encodeURI(attachment.key));
    }

    const title = serializeFilename(document.title) || "Untitled";
    zip.file(`${title}.md`, text, {
      date: document.updatedAt,
      comment: JSON.stringify({
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      }),
    });

    if (doc.children && doc.children.length) {
      const folder = zip.folder(title);

      if (folder) {
        await addToArchive(folder, doc.children);
      }
    }
  }
}

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

async function archiveToPath(zip: JSZip) {
  return new Promise((resolve, reject) => {
    tmp.file(
      {
        prefix: "export-",
        postfix: ".zip",
      },
      (err, path) => {
        if (err) return reject(err);
        zip
          .generateNodeStream({
            type: "nodebuffer",
            streamFiles: true,
          })
          .pipe(fs.createWriteStream(path))
          .on("finish", () => resolve(path))
          .on("error", reject);
      }
    );
  });
}

// @ts-expect-error ts-migrate(2749) FIXME: 'Collection' refers to a value, but is being used ... Remove this comment to see the full error message
export async function archiveCollections(collections: Collection[]) {
  const zip = new JSZip();

  for (const collection of collections) {
    if (collection.documentStructure) {
      const folder = zip.folder(collection.name);

      if (folder) {
        await addToArchive(folder, collection.documentStructure);
      }
    }
  }

  return archiveToPath(zip);
}
