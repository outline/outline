import JSZip from "jszip";
import escapeRegExp from "lodash/escapeRegExp";
import mime from "mime-types";
import { v4 as uuidv4 } from "uuid";
import documentImporter from "@server/commands/documentImporter";
import Logger from "@server/logging/Logger";
import { FileOperation, User } from "@server/models";
import ZipHelper, { FileTreeNode } from "@server/utils/ZipHelper";
import ImportTask, { StructuredImportData } from "./ImportTask";

export default class ImportMarkdownZipTask extends ImportTask {
  public async parseData(
    stream: NodeJS.ReadableStream,
    fileOperation: FileOperation
  ): Promise<StructuredImportData> {
    const zip = await JSZip.loadAsync(stream);
    const tree = ZipHelper.toFileTree(zip);

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
    const user = await User.findByPk(fileOperation.userId, {
      rejectOnEmpty: true,
    });
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
      await Promise.all(
        children.map(async (child) => {
          // special case for folders of attachments
          if (
            child.name === "uploads" ||
            (child.children.length > 0 && child.path.includes("/uploads/"))
          ) {
            return parseNodeChildren(child.children, collectionId);
          }

          const zipObject = zip.files[child.path];
          if (!zipObject) {
            Logger.info("task", "Zip file referenced path that doesn't exist", {
              path: child.path,
            });
            return;
          }

          const id = uuidv4();

          // this is an attachment
          if (child.path.includes("/uploads/") && child.children.length === 0) {
            output.attachments.push({
              id,
              name: child.name,
              path: child.path,
              mimeType: mime.lookup(child.path) || "application/octet-stream",
              buffer: () => zipObject.async("nodebuffer"),
            });
            return;
          }

          const { title, text } = await documentImporter({
            mimeType: "text/markdown",
            fileName: child.name,
            content: await zipObject.async("string"),
            user,
            ip: user.lastActiveIp || undefined,
          });

          let metadata;
          try {
            metadata = zipObject.comment ? JSON.parse(zipObject.comment) : {};
          } catch (err) {
            Logger.debug(
              "task",
              `ZIP comment found for ${child.name}, but could not be parsed as metadata: ${zipObject.comment}`
            );
          }

          const createdAt = metadata.createdAt
            ? new Date(metadata.createdAt)
            : zipObject.date;

          const updatedAt = metadata.updatedAt
            ? new Date(metadata.updatedAt)
            : zipObject.date;

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
              updatedAt,
              createdAt,
              collectionId,
              parentDocumentId,
              path: child.path,
            });
          }

          await parseNodeChildren(child.children, collectionId, id);
        })
      );
    }

    // All nodes in the root level should be collections
    for (const node of tree) {
      if (node.path.endsWith("/")) {
        const collectionId = uuidv4();
        output.collections.push({
          id: collectionId,
          name: node.title,
        });
        await parseNodeChildren(node.children, collectionId);
      } else {
        Logger.debug("task", `Unhandled file in zip: ${node.path}`, {
          fileOperationId: fileOperation.id,
        });
      }
    }

    // Check all of the attachments we've created against urls in the text
    // and replace them out with attachment redirect urls before continuing.
    for (const document of output.documents) {
      for (const attachment of output.attachments) {
        const encodedPath = encodeURI(attachment.path);

        // Pull the collection and subdirectory out of the path name, upload
        // folders in an export are relative to the document itself
        const normalizedAttachmentPath = encodedPath.replace(
          /(.*)uploads\//,
          "uploads/"
        );

        const reference = `<<${attachment.id}>>`;
        document.text = document.text
          .replace(new RegExp(escapeRegExp(encodedPath), "g"), reference)
          .replace(
            new RegExp(`/?${escapeRegExp(normalizedAttachmentPath)}`, "g"),
            reference
          );
      }
    }

    return output;
  }
}
