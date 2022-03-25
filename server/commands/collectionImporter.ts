import fs from "fs";
import os from "os";
import path from "path";
import File from "formidable/lib/file";
import invariant from "invariant";
import { values, keys } from "lodash";
import { v4 as uuidv4 } from "uuid";
import Logger from "@server/logging/logger";
import { APM } from "@server/logging/tracing";
import { Attachment, Event, Document, Collection, User } from "@server/models";
import { parseOutlineExport, Item } from "@server/utils/zip";
import { FileImportError } from "../errors";
import attachmentCreator from "./attachmentCreator";
import documentCreator from "./documentCreator";
import documentImporter from "./documentImporter";

type FileWithPath = File & {
  path: string;
};

async function collectionImporter({
  file,
  type,
  user,
  ip,
}: {
  file: FileWithPath;
  user: User;
  type: "outline";
  ip: string;
}) {
  // load the zip structure into memory
  const zipData = await fs.promises.readFile(file.path);
  let items: Item[];

  try {
    items = await parseOutlineExport(zipData);
  } catch (err) {
    throw FileImportError(err.message);
  }

  if (!items.filter((item) => item.type === "document").length) {
    throw FileImportError(
      "Uploaded file does not contain importable documents"
    );
  }

  // store progress and pointers
  const collections: Record<string, Collection> = {};
  const documents: Record<string, Document> = {};
  const attachments: Record<string, Attachment> = {};

  for (const item of items) {
    if (item.type === "collection") {
      // check if collection with name exists
      const response = await Collection.findOrCreate({
        where: {
          teamId: user.teamId,
          name: item.name,
        },
        defaults: {
          createdById: user.id,
          permission: "read_write",
        },
      });

      let collection = response[0];
      const isCreated = response[1];

      // create new collection if name already exists, yes it's possible that
      // there is also a "Name (Imported)" but this is a case not worth dealing
      // with right now
      if (!isCreated) {
        const name = `${item.name} (Imported)`;
        collection = await Collection.create({
          teamId: user.teamId,
          createdById: user.id,
          name,
          permission: "read_write",
        });
        await Event.create({
          name: "collections.create",
          collectionId: collection.id,
          teamId: collection.teamId,
          actorId: user.id,
          data: {
            name,
          },
          ip,
        });
      }

      collections[item.path] = collection;
      continue;
    }

    if (item.type === "document") {
      const collectionDir = item.dir.split("/")[0];
      const collection = collections[collectionDir];
      invariant(collection, `Collection must exist for document ${item.dir}`);

      // we have a document
      const content = await item.item.async("string");
      const name = path.basename(item.name);
      const tmpDir = os.tmpdir();
      const tmpFilePath = `${tmpDir}/upload-${uuidv4()}`;
      await fs.promises.writeFile(tmpFilePath, content);

      const file = new File({
        name,
        type: "text/markdown",
        path: tmpFilePath,
      });
      const { text, title } = await documentImporter({
        file,
        user,
        ip,
      });

      await fs.promises.unlink(tmpFilePath);
      // must be a nested document, find and reference the parent document
      let parentDocumentId;

      if (item.depth > 1) {
        const parentDocument =
          documents[`${item.dir}.md`] || documents[item.dir];
        invariant(parentDocument, `Document must exist for parent ${item.dir}`);
        parentDocumentId = parentDocument.id;
      }

      const document = await documentCreator({
        source: "import",
        title,
        text,
        publish: true,
        collectionId: collection.id,
        createdAt: item.metadata.createdAt
          ? new Date(item.metadata.createdAt)
          : item.item.date,
        updatedAt: item.item.date,
        parentDocumentId,
        user,
        ip,
      });
      documents[item.path] = document;
      continue;
    }

    if (item.type === "attachment") {
      const buffer = await item.item.async("nodebuffer");
      const attachment = await attachmentCreator({
        source: "import",
        name: item.name,
        type,
        buffer,
        user,
        ip,
      });
      attachments[item.path] = attachment;
      continue;
    }

    Logger.info("commands", `Skipped importing ${item.path}`);
  }

  // All collections, documents, and attachments have been created - time to
  // update the documents to point to newly uploaded attachments where possible
  for (const attachmentPath of keys(attachments)) {
    const attachment = attachments[attachmentPath];

    for (const document of values(documents)) {
      // pull the collection and subdirectory out of the path name, upload folders
      // in an Outline export are relative to the document itself
      const normalizedAttachmentPath = attachmentPath.replace(
        /(.*)uploads\//,
        "uploads/"
      );

      document.text = document.text
        .replace(attachmentPath, attachment.redirectUrl)
        .replace(normalizedAttachmentPath, attachment.redirectUrl)
        .replace(`/${normalizedAttachmentPath}`, attachment.redirectUrl);

      // does nothing if the document text is unchanged
      await document.save({
        fields: ["text"],
      });
    }
  }

  // reload collections to get document mapping
  for (const collection of values(collections)) {
    await collection.reload();
  }

  return {
    documents: values(documents),
    collections: values(collections),
    attachments: values(attachments),
  };
}

export default APM.traceFunction({
  serviceName: "command",
  spanName: "collectionImporter",
})(collectionImporter);
