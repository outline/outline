// @flow
import fs from "fs";
import path from "path";
import File from "formidable/lib/file";
import invariant from "invariant";
import JSZip from "jszip";
import { values, keys } from "lodash";
import { Attachment, Document, Collection, User } from "../models";
import attachmentCreator from "./attachmentCreator";
import documentCreator from "./documentCreator";
import documentImporter from "./documentImporter";

export default async function documentBatchImporter({
  file,
  type,
  user,
  ip,
}: {
  file: File,
  user: User,
  type: "outline",
  ip: string,
}) {
  // load the zip structure into memory
  const zipData = await fs.promises.readFile(file.path);
  const zip = await JSZip.loadAsync(zipData);

  // store progress and pointers
  let collections: { string: Collection } = {};
  let documents: { string: Document } = {};
  let attachments: { string: Attachment } = {};

  // this is so we can use async / await a little easier
  let folders = [];
  zip.forEach(async function (path, item) {
    folders.push([path, item]);
  });

  for (const [rawPath, item] of folders) {
    const itemPath = rawPath.replace(/\/$/, "");
    const itemDir = path.dirname(itemPath);
    const name = path.basename(item.name);
    const depth = itemPath.split("/").length - 1;

    // known skippable items
    if (itemPath.startsWith("__MACOSX") || itemPath.endsWith(".DS_Store")) {
      continue;
    }

    if (depth === 0 && item.dir && name) {
      // check if collection with name exists
      let [collection, isCreated] = await Collection.findOrCreate({
        where: {
          teamId: user.teamId,
          name,
        },
        defaults: {
          creatorId: user.id,
          private: false,
        },
      });

      // create new collection if name already exists, yes it's possible that
      // there is also a "Name (Imported)" but this is a case not worth dealing
      // with right now
      if (!isCreated) {
        collection = await Collection.create({
          teamId: user.teamId,
          creatorId: user.id,
          name: `${name} (Imported)`,
          private: false,
        });
      }

      collections[itemPath] = collection;
      continue;
    }

    if (depth > 0 && !item.dir && item.name.endsWith(".md")) {
      const collectionDir = itemDir.split("/")[0];
      const collection = collections[collectionDir];
      invariant(collection, `Collection must exist for document ${itemDir}`);

      // we have a document
      const content = await item.async("string");
      const name = path.basename(item.name);
      await fs.promises.writeFile(`/tmp/${name}`, content);
      const file = new File({
        name,
        type: "text/markdown",
        path: `/tmp/${name}`,
      });

      const { text, title } = await documentImporter({
        file,
        user,
        ip,
      });

      // must be a nested document, find and reference the parent document
      let parentDocumentId;
      if (depth > 1) {
        const parentDocument = documents[`${itemDir}.md`] || documents[itemDir];
        invariant(parentDocument, `Document must exist for parent ${itemDir}`);
        parentDocumentId = parentDocument.id;
      }

      const document = await documentCreator({
        title,
        text,
        publish: true,
        collectionId: collection.id,
        parentDocumentId,
        user,
        ip,
      });

      documents[itemPath] = document;
      continue;
    }

    if (depth > 0 && !item.dir && itemPath.includes("uploads")) {
      // we have an attachment
      const buffer = await item.async("nodebuffer");
      const attachment = await attachmentCreator({
        name,
        type,
        buffer,
        user,
        ip,
      });
      attachments[itemPath] = attachment;
      continue;
    }

    console.log(`Skipped ${itemPath}`);
  }

  // All collections, documents, and attachments have been created – time to
  // update the documents to point to newly uploaded attachments where possible
  for (const attachmentPath of keys(attachments)) {
    const attachment = attachments[attachmentPath];

    for (const document of values(documents)) {
      document.text = document.text
        .replace(attachmentPath, attachment.redirectUrl)
        .replace(`/${attachmentPath}`, attachment.redirectUrl);

      // does nothing if the document text is unchanged
      await document.save();
    }
  }

  return {
    documents,
    collections,
    attachments,
  };
}
