// @flow
import fs from "fs";
import * as Sentry from "@sentry/node";
import JSZip from "jszip";
import tmp from "tmp";
import { Attachment, Collection, Document } from "../models";
import { serializeFilename } from "./fs";
import { getFileByKey } from "./s3";

async function addToArchive(zip, documents) {
  for (const doc of documents) {
    const document = await Document.findByPk(doc.id);
    if (!document) {
      continue;
    }
    let text = document.toMarkdown();

    const attachments = await Attachment.findAll({
      where: { documentId: document.id },
    });

    for (const attachment of attachments) {
      await addImageToArchive(zip, attachment.key);
      text = text.replace(attachment.redirectUrl, encodeURI(attachment.key));
    }

    const title = serializeFilename(document.title) || "Untitled";

    zip.file(`${title}.md`, text, {
      date: document.updatedAt,
      comment: JSON.stringify({
        pinned: document.pinned,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      }),
    });

    if (doc.children && doc.children.length) {
      const folder = zip.folder(title);
      await addToArchive(folder, doc.children);
    }
  }
}

async function addImageToArchive(zip, key) {
  try {
    const img = await getFileByKey(key);
    zip.file(key, img, { createFolders: true });
  } catch (err) {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
    }
    // error during file retrieval
    console.error(err);
  }
}

async function archiveToPath(zip) {
  return new Promise((resolve, reject) => {
    tmp.file({ prefix: "export-", postfix: ".zip" }, (err, path) => {
      if (err) return reject(err);

      zip
        .generateNodeStream({ type: "nodebuffer", streamFiles: true })
        .pipe(fs.createWriteStream(path))
        .on("finish", () => resolve(path))
        .on("error", reject);
    });
  });
}

export async function archiveCollection(collection: Collection) {
  const zip = new JSZip();

  if (collection.documentStructure) {
    const folder = zip.folder(collection.name);
    await addToArchive(folder, collection.documentStructure);
  }

  return archiveToPath(zip);
}

export async function archiveCollections(collections: Collection[]) {
  const zip = new JSZip();

  for (const collection of collections) {
    if (collection.documentStructure) {
      const folder = zip.folder(collection.name);
      await addToArchive(folder, collection.documentStructure);
    }
  }
  return archiveToPath(zip);
}
