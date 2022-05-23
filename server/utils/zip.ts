import fs from "fs";
import path from "path";
import JSZip, { JSZipObject } from "jszip";
import { find } from "lodash";
import tmp from "tmp";
import Logger from "@server/logging/Logger";
import Attachment from "@server/models/Attachment";
import Collection from "@server/models/Collection";
import Document from "@server/models/Document";
import { NavigationNode } from "~/types";
import { deserializeFilename, serializeFilename } from "./fs";
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
async function archiveToPath(zip: JSZip): Promise<string> {
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
      const folder = zip.folder(serializeFilename(collection.name));

      if (folder) {
        await addDocumentTreeToArchive(folder, collection.documentStructure);
      }
    }
  }

  return archiveToPath(zip);
}

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

/**
 * Converts the flat structure returned by JSZIP into a nested file structure
 * for easier processing.
 *
 * @param paths An array of paths to files in the zip
 * @returns
 */
export function zipAsFileTree(zip: JSZip) {
  const paths = Object.keys(zip.files).map((filePath) => `/${filePath}`);
  const tree: FileTreeNode[] = [];

  paths.forEach(function (filePath) {
    if (filePath.startsWith("/__MACOSX")) {
      return;
    }

    const pathParts = filePath.split("/");

    // Remove first blank element from the parts array.
    pathParts.shift();

    let currentLevel = tree; // initialize currentLevel to root

    pathParts.forEach(function (name) {
      // check to see if the path already exists.
      const existingPath = find(currentLevel, {
        name,
      });

      if (existingPath) {
        // The path to this item was already in the tree, so don't add again.
        // Set the current level to this path's children
        currentLevel = existingPath.children;
      } else if (name.endsWith(".DS_Store") || !name) {
        return;
      } else {
        const newPart = {
          name,
          path: filePath.replace(/^\//, ""),
          title: deserializeFilename(path.parse(path.basename(name)).name),
          children: [],
        };

        currentLevel.push(newPart);
        currentLevel = newPart.children;
      }
    });
  });

  return tree;
}
