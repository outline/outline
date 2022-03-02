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

async function addDocumentTreeToArchive(
  zip: JSZip,
  documents: NavigationNode[]
) {
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

    let title = serializeFilename(document.title) || "Untitled";

    title = safeAddFileToArchive(zip, `${title}.md`, text, {
      date: document.updatedAt,
      comment: JSON.stringify({
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      }),
    });

    if (doc.children && doc.children.length) {
      const folder = zip.folder(path.parse(title).name);

      if (folder) {
        await addDocumentTreeToArchive(folder, doc.children);
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

/**
 * Adds content to a zip file, if the given filename already exists in the zip
 * then it will automatically increment numbers at the end of the filename.
 *
 * @param zip JSZip object to add to
 * @param key filename with extension
 * @param content the content to add
 * @param options options for added content
 * @returns The new title
 */
function safeAddFileToArchive(
  zip: JSZip,
  key: string,
  content: string | Uint8Array | ArrayBuffer | Blob,
  options: JSZip.JSZipFileOptions
) {
  // @ts-expect-error root exists
  const root = zip.root;

  // Filenames in the directory already
  const keysInDirectory = Object.keys(zip.files)
    .filter((k) => k.includes(root))
    .filter((k) => !k.endsWith("/"))
    .map((k) => path.basename(k).replace(/\s\((\d+)\)\./, "."));

  // The number of duplicate filenames
  const existingKeysCount = keysInDirectory.filter((t) => t === key).length;
  const filename = path.parse(key).name;
  const extension = path.extname(key);

  // Construct the new de-duplicated filename (if any)
  const safeKey =
    existingKeysCount > 0
      ? `${filename} (${existingKeysCount})${extension}`
      : key;

  zip.file(safeKey, content, options);
  return safeKey;
}

/**
 * Write a zip file to a temporary disk location
 *
 * @param zip JSZip object
 * @returns pathname of the temporary file where the zip was written to disk
 */
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
        await addDocumentTreeToArchive(folder, collection.documentStructure);
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
