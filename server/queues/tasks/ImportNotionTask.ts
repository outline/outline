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

    async function parseNodeChildren(
      children: FileTreeNode[],
      collectionId: string,
      parentDocumentId?: string
    ): Promise<void> {
      if (!user) {
        throw new Error("User not found");
      }

      await Promise.all(
        children.map(async (child) => {
          const zipObject = zip.files[child.path];
          const id = uuidv4();

          // Ignore the CSV's for databases
          if (child.path.endsWith(".csv")) {
            return;
          }

          // If it's not a text file we're going to treat it as an attachment.
          const mimeType = mime.lookup(child.name);
          if (mimeType && !mimeType.startsWith("text")) {
            output.attachments.push({
              id,
              name: child.name,
              path: child.path,
              mimeType,
              buffer: await zipObject.async("nodebuffer"),
            });
            return;
          }

          const fileName = child.title.replace(/\s[0-9a-fA-F]{32}$/, "");
          const { title, text } = await documentImporter({
            mimeType: "text/markdown",
            fileName,
            content: await zipObject.async("string"),
            user,
            ip: user.lastActiveIp || undefined,
          });

          const existingEmptyDocumentIndex = output.documents.findIndex(
            (doc) =>
              doc.title === title &&
              doc.collectionId === collectionId &&
              doc.parentDocumentId === parentDocumentId &&
              doc.text === ""
          );

          // When there is a file and a folder with the same name this handles
          // the case by combining the two into one document with nested children
          if (existingEmptyDocumentIndex !== -1) {
            output.documents[existingEmptyDocumentIndex].text = text;
          } else {
            output.documents.push({
              id,
              title,
              text,
              collectionId,
              parentDocumentId,
              path: child.path,
            });
          }

          await parseNodeChildren(child.children, collectionId, id);
        })
      );
    }

    // All nodes in the root level should become collections
    for (const node of tree) {
      const name = node.title
        .replace(
          /\s[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
          ""
        )
        .replace(/\s[0-9a-fA-F]{32}$/, "");
      const mimeType = mime.lookup(node.name);

      const existingCollectionIndex = output.collections.findIndex(
        (collection) => collection.name === name
      );
      const existingCollection = output.collections[existingCollectionIndex];
      const collectionId = existingCollection?.id || uuidv4();
      let description;

      // Root level docs become collection descriptions
      if (mimeType && node.name.endsWith(".md")) {
        const zipObject = zip.files[node.path];
        const { text } = await documentImporter({
          mimeType: "text/markdown",
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
        });
      }
    }

    // Check all of the attachments we've created against urls in the text
    // and replace them out with attachment redirect urls before continuing.
    for (const document of output.documents) {
      for (const attachment of output.attachments) {
        // Pull the collection and subdirectory out of the path name, upload
        // folders in an export are relative to the document itself
        const folder = path.basename(document.path);
        const attachmentName = encodeURIComponent(attachment.name);

        const reference = `<<${attachment.id}>>`;
        document.text = document.text
          .replace(`${encodeURIComponent(folder)}/${attachmentName}`, reference)
          .replace(`${folder}/${attachmentName}`, reference);
      }
    }

    return output;
  }
}
