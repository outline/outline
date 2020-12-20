// @flow
import fs from "fs";
import path from "path";
import File from "formidable/lib/file";
import JSZip from "jszip";
import { Collection, User } from "../models";
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
  const zipData = await fs.promises.readFile(file.path);
  const zip = await JSZip.loadAsync(zipData);

  async function ingestDocuments(
    zip: JSZip,
    collectionId: string,
    parentDocumentId?: string
  ) {
    const documents = [];

    let items = [];
    zip.forEach(async function (path, item) {
      items.push([path, item]);
    });

    // TODO: attachments

    // 2 passes, one for documents and then second for their nested documents
    for (const [_, item] of items) {
      if (item.dir) return;

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

      const document = await documentCreator({
        title,
        text,
        publish: true,
        collectionId,
        parentDocumentId,
        user,
        ip,
      });

      // Keep track of which documents have been created
      documents.push(document);
    }

    for (const [filePath, item] of folders) {
      const name = path.basename(item.name);

      // treat items in here as nested documents
      if (!item.dir) return;
      if (name === "uploads") return;

      const document = documents.find((doc) => doc.title === name);
      if (!document) {
        console.log(
          `Couldn't find a matching parent document for folder ${name}`
        );
        return;
      }

      // ensure document is created first, get parentDocumentId
      await ingestDocuments(zip.folder(filePath), collectionId, document.id);
    }
  }

  let folders = [];
  zip.forEach(async function (path, item) {
    folders.push([path, item]);
  });

  for (const [folderPath, item] of folders) {
    const name = path.basename(item.name);

    if (folderPath.startsWith("__MACOSX") || folderPath.endsWith(".DS_Store")) {
      continue;
    }

    // all top level  items must be directories representing collections
    console.log("iterating over", folderPath);

    // treat this as a collection
    if (item.dir) {
      // create collection if a collection with this name doesn't exist
      const [collection, isCreated] = await Collection.findOrCreate({
        where: {
          teamId: user.teamId,
          name,
        },
        defaults: {
          private: false,
        },
      });

      console.log(`Collection ${name} ${isCreated ? "created" : "found"}`);
      await ingestDocuments(zip.folder(folderPath), collection.id);
    }
  }
}
