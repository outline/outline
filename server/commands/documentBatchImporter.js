// @flow
import fs from "fs";
import path from "path";
import File from "formidable/lib/file";
import invariant from "invariant";
import JSZip from "jszip";
import { Collection, User } from "../models";
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
  let attachments = {};
  let collections = {};
  let documents = {};

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

    // all top level items must be directories representing collections
    console.log("iterating over", itemPath, depth);

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
      const collection = collections[itemDir];
      invariant(collection, "Collection must exist for document", itemDir);

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

      // must be a nested document, find the parent
      if (depth > 1) {
        console.log("nested doc", itemDir);
      }

      const document = await documentCreator({
        title,
        text,
        publish: true,
        collectionId: collection.id,
        parentDocumentId: undefined,
        user,
        ip,
      });

      documents[itemPath] = document;
      continue;
    }

    if (depth > 0 && item.dir && name !== "uploads") {
      // we have a nested document, create if it doesn't exist based on title
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

  return {
    documents,
    collections,
    attachments,
  };
}
