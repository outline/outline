import fs from "fs";
import path from "path";
import JSZip, { JSZipObject } from "jszip";
import tmp from "tmp";
import Logger from "@server/logging/logger";
import Attachment from "@server/models/Attachment";
import Collection from "@server/models/Collection";
import Document from "@server/models/Document";
import { NavigationNode } from "~/types";
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

async function addToArchive(zip: JSZip, documents: NavigationNode[]) {
  for (const doc of documents) {
    const document = await Document.findByPk(doc.id);

    if (!document) {
      continue;
    }

    let text = document.toMarkdown();
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
        if (err) {
          return reject(err);
        }
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

export async function parseOutlineExport(
  input: File | Buffer
): Promise<Item[]> {
  const zip = await JSZip.loadAsync(input);
  // this is so we can use async / await a little easier
  const items: Item[] = [];

  for (const rawPath in zip.files) {
    const item = zip.files[rawPath];

    if (!item) {
      throw new Error(
        `No item at ${rawPath} in zip file. This zip file might be corrupt.`
      );
    }

    const itemPath = rawPath.replace(/\/$/, "");
    const dir = path.dirname(itemPath);
    const name = path.basename(item.name);
    const depth = itemPath.split("/").length - 1;

    // known skippable items
    if (itemPath.startsWith("__MACOSX") || itemPath.endsWith(".DS_Store")) {
      continue;
    }

    // attempt to parse extra metadata from zip comment
    let metadata = {};

    try {
      metadata = item.comment ? JSON.parse(item.comment) : {};
    } catch (err) {
      console.log(
        `ZIP comment found for ${item.name}, but could not be parsed as metadata: ${item.comment}`
      );
    }

    if (depth === 0 && !item.dir) {
      throw new Error(
        "Root of zip file must only contain folders representing collections"
      );
    }

    let type: ItemType | undefined;

    if (depth === 0 && item.dir && name) {
      type = "collection";
    }

    if (depth > 0 && !item.dir && item.name.endsWith(".md")) {
      type = "document";
    }

    if (depth > 0 && !item.dir && itemPath.includes("uploads")) {
      type = "attachment";
    }

    if (!type) {
      continue;
    }

    items.push({
      path: itemPath,
      dir,
      name,
      depth,
      type,
      metadata,
      item,
    });
  }

  return items;
}
