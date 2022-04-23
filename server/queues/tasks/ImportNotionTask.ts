import path from "path";
import JSZip from "jszip";
import mime from "mime-types";
import { v4 as uuidv4 } from "uuid";
import documentImporter from "@server/commands/documentImporter";
import Logger from "@server/logging/logger";
import { FileOperation, User } from "@server/models";
import { zipAsFileTree, FileTreeNode } from "@server/utils/zip";
import ImportTask, { StructuredImportData } from "./ImportTask";

export default class ImportNotionTask extends ImportTask {
  public async parseData(
    buffer: Buffer,
    fileOperation: FileOperation
  ): Promise<StructuredImportData> {
    const zip = await JSZip.loadAsync(buffer);
    const tree = zipAsFileTree(zip);
    return this.parseFileTree({ fileOperation, zip, tree });
  }

  /**
   * Converts the file structure from zipAsFileTree into documents,
   * collections, and attachments.
   *
   * @param tree An array of FileTreeNode representing root files in the zip
   * @returns A StructuredImportData object
   */
  private async parseFileTree({
    zip,
    tree,
    fileOperation,
  }: {
    zip: JSZip;
    fileOperation: FileOperation;
    tree: FileTreeNode[];
  }): Promise<StructuredImportData> {
    const user = await User.findByPk(fileOperation.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const output: StructuredImportData = {
      collections: [],
      documents: [],
      attachments: [],
    };

    const parseNodeChildren = async (
      children: FileTreeNode[],
      collectionId: string,
      parentDocumentId?: string
    ): Promise<void> => {
      if (!user) {
        throw new Error("User not found");
      }

      await Promise.all(
        children.map(async (child) => {
          // Ignore the CSV's for databases upfront
          if (child.path.endsWith(".csv")) {
            return;
          }

          const zipObject = zip.files[child.path];
          const id = uuidv4();
          const match = child.title.match(this.NotionUUIDRegex);
          const name = child.title.replace(this.NotionUUIDRegex, "");
          const sourceId = match ? match[0] : undefined;

          // If it's not a text file we're going to treat it as an attachment.
          const mimeType = mime.lookup(child.name);
          const isDocument =
            mimeType === "text/markdown" ||
            mimeType === "text/plain" ||
            mimeType === "text/html";

          if (!isDocument && mimeType) {
            output.attachments.push({
              id,
              name: child.name,
              path: child.path,
              mimeType,
              buffer: await zipObject.async("nodebuffer"),
              sourceId,
            });
            return;
          }

          Logger.debug("task", `Processing ${name} as ${mimeType}`);

          const { title, text } = await documentImporter({
            mimeType: mimeType || "text/markdown",
            fileName: name,
            content: await zipObject.async("string"),
            user,
            ip: user.lastActiveIp || undefined,
          });

          const existingDocumentIndex = output.documents.findIndex(
            (doc) => doc.sourceId === sourceId
          );

          const existingDocument = output.documents[existingDocumentIndex];

          // When there is a file and a folder with the same name this handles
          // the case by combining the two into one document with nested children
          if (existingDocument) {
            if (existingDocument.text === "") {
              output.documents[existingDocumentIndex].text = text;
            }

            await parseNodeChildren(
              child.children,
              collectionId,
              existingDocument.id
            );
          } else {
            output.documents.push({
              id,
              title,
              text,
              collectionId,
              parentDocumentId,
              path: child.path,
              sourceId,
            });
            await parseNodeChildren(child.children, collectionId, id);
          }
        })
      );
    };

    // All nodes in the root level should become collections
    for (const node of tree) {
      const match = node.title.match(this.NotionUUIDRegex);
      const name = node.title.replace(this.NotionUUIDRegex, "");
      const sourceId = match ? match[0] : undefined;
      const mimeType = mime.lookup(node.name);

      const existingCollectionIndex = output.collections.findIndex(
        (collection) => collection.sourceId === sourceId
      );
      const existingCollection = output.collections[existingCollectionIndex];
      const collectionId = existingCollection?.id || uuidv4();
      let description;

      // Root level docs become collection descriptions
      if (
        mimeType === "text/markdown" ||
        mimeType === "text/plain" ||
        mimeType === "text/html"
      ) {
        const zipObject = zip.files[node.path];
        const { text } = await documentImporter({
          mimeType,
          fileName: name,
          content: await zipObject.async("string"),
          user,
          ip: user.lastActiveIp || undefined,
        });

        description = text;
      } else if (node.children.length > 0) {
        await parseNodeChildren(node.children, collectionId);
      } else {
        Logger.debug("task", `Unhandled file in zip: ${node.path}`, {
          fileOperationId: fileOperation.id,
        });
        continue;
      }

      if (existingCollectionIndex !== -1) {
        if (description) {
          output.collections[existingCollectionIndex].description = description;
        }
      } else {
        output.collections.push({
          id: collectionId,
          name,
          description,
          sourceId,
        });
      }
    }

    // Check all of the attachments we've created against urls in the text
    // and replace them out with attachment redirect urls before continuing.
    for (const document of output.documents) {
      for (const attachment of output.attachments) {
        // Pull the collection and subdirectory out of the path name, upload
        // folders in an export are relative to the document itself
        const folder = path.parse(document.path).name;
        const attachmentName = encodeURIComponent(attachment.name);

        const reference = `<<${attachment.id}>>`;
        document.text = document.text
          .replace(
            new RegExp(`${encodeURIComponent(folder)}/${attachmentName}`, "g"),
            reference
          )
          .replace(new RegExp(`${folder}/${attachmentName}`, "g"), reference);
      }
    }

    return output;
  }

  private NotionUUIDRegex = /\s([0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}|[0-9a-fA-F]{32})$/;
}
