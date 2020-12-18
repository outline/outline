// @flow
import fs from "fs";
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
  const zipData = await fs.promises.readFile(file.path, "utf8");
  const zip = await JSZip.loadAsync(zipData);

  async function ingestDocuments(
    zip: JSZip,
    collectionId: string,
    parentDocumentId?: string
  ) {
    const documents = [];

    // TODO: attachments

    // 2 passes, one for documents and then second for their nested documents
    zip.forEach(async function (filePath, item) {
      if (item.dir) return;

      const fileData = await item.async("blob");
      const file = new File([fileData], item.name);

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
    });

    zip.forEach(async function (filePath, item) {
      // treat items in here as nested documents
      if (!item.dir) return;
      if (item.name === "uploads") return;

      const document = documents.find((doc) => doc.title === item.name);
      if (!document) {
        console.log(
          `Couldn't find a matching parent document for folder ${item.name}`
        );
        return;
      }

      // ensure document is created first, get parentDocumentId
      await ingestDocuments(zip.folder(filePath), collectionId, document.id);
    });
  }

  zip.forEach(async function (folderPath, item) {
    // all top level items must be directories representing collections
    console.log("iterating over", folderPath);

    // treat this as a collection
    if (item.dir) {
      // create collection if a collection with this name doesn't exist
      const [collection, isCreated] = await Collection.findOrCreate({
        where: {
          teamId: user.teamId,
          name: item.name,
        },
        defaults: {
          private: false,
        },
      });

      console.log(`Collection ${item.name} ${isCreated ? "created" : "found"}`);

      await ingestDocuments(zip.folder(folderPath), collection.id);
    }
  });
}
