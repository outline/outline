import path from "path";
import fs from "fs-extra";
import escapeRegExp from "lodash/escapeRegExp";
import mime from "mime-types";
import { v4 as uuidv4 } from "uuid";
import documentImporter from "@server/commands/documentImporter";
import { createContext } from "@server/context";
import Logger from "@server/logging/Logger";
import { FileOperation, User } from "@server/models";
import { Buckets } from "@server/models/helpers/AttachmentHelper";
import { sequelize } from "@server/storage/database";
import ImportHelper, { FileTreeNode } from "@server/utils/ImportHelper";
import ImportTask, { StructuredImportData } from "./ImportTask";

export default class ImportMarkdownZipTask extends ImportTask {
  public async parseData(
    dirPath: string,
    fileOperation: FileOperation
  ): Promise<StructuredImportData> {
    const tree = await ImportHelper.toFileTree(dirPath);
    if (!tree) {
      throw new Error("Could not find valid content in zip file");
    }

    return this.parseFileTree(fileOperation, tree.children);
  }

  /**
   * Converts the file structure from zipAsFileTree into documents,
   * collections, and attachments.
   *
   * @param fileOperation The file operation
   * @param tree An array of FileTreeNode representing root files in the zip
   * @returns A StructuredImportData object
   */
  private async parseFileTree(
    fileOperation: FileOperation,
    tree: FileTreeNode[]
  ): Promise<StructuredImportData> {
    const user = await User.findByPk(fileOperation.userId, {
      rejectOnEmpty: true,
    });
    const output: StructuredImportData = {
      collections: [],
      documents: [],
      attachments: [],
    };

    const docPathToIdMap = new Map<string, string>();

    async function parseNodeChildren(
      children: FileTreeNode[],
      collectionId: string,
      parentDocumentId?: string
    ): Promise<void> {
      await Promise.all(
        children.map(async (child) => {
          // special case for folders of attachments
          if (
            child.name === Buckets.uploads ||
            child.name === Buckets.public ||
            (child.children.length > 0 &&
              (child.path.includes(`/${Buckets.public}/`) ||
                child.path.includes(`/${Buckets.uploads}/`)))
          ) {
            return parseNodeChildren(child.children, collectionId);
          }

          const id = uuidv4();

          // this is an attachment
          if (
            child.children.length === 0 &&
            (child.path.includes(`/${Buckets.uploads}/`) ||
              child.path.includes(`/${Buckets.public}/`))
          ) {
            output.attachments.push({
              id,
              name: child.name,
              path: child.path,
              mimeType: mime.lookup(child.path) || "application/octet-stream",
              buffer: () => fs.readFile(child.path),
            });
            return;
          }

          const { title, icon, text } = await sequelize.transaction(
            async (transaction) =>
              documentImporter({
                mimeType: "text/markdown",
                fileName: child.name,
                content:
                  child.children.length > 0
                    ? ""
                    : await fs.readFile(child.path, "utf8"),
                user,
                ctx: createContext({ user, transaction }),
              })
          );

          const existingDocumentIndex = output.documents.findIndex(
            (doc) =>
              doc.title === title &&
              doc.collectionId === collectionId &&
              doc.parentDocumentId === parentDocumentId
          );

          const existingDocument = output.documents[existingDocumentIndex];

          // When there is a file and a folder with the same name this handles
          // the case by combining the two into one document with nested children
          if (existingDocument) {
            docPathToIdMap.set(child.path, existingDocument.id);

            if (existingDocument.text === "") {
              output.documents[existingDocumentIndex].text = text;
            }

            await parseNodeChildren(
              child.children,
              collectionId,
              existingDocument.id
            );
          } else {
            docPathToIdMap.set(child.path, id);

            output.documents.push({
              id,
              title,
              icon,
              text,
              collectionId,
              parentDocumentId,
              path: child.path,
              mimeType: "text/markdown",
            });

            await parseNodeChildren(child.children, collectionId, id);
          }
        })
      );
    }

    // All nodes in the root level should be collections
    for (const node of tree) {
      if (node.children.length > 0) {
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

    for (const document of output.documents) {
      // Check all of the attachments we've created against urls in the text
      // and replace them out with attachment redirect urls before continuing.
      for (const attachment of output.attachments) {
        const encodedPath = encodeURI(attachment.path);

        // Pull the collection and subdirectory out of the path name, upload
        // folders in an export are relative to the document itself
        const normalizedAttachmentPath = encodedPath
          .replace(
            new RegExp(`(.*)/${Buckets.uploads}/`),
            `${Buckets.uploads}/`
          )
          .replace(new RegExp(`(.*)/${Buckets.public}/`), `${Buckets.public}/`);

        const reference = `<<${attachment.id}>>`;
        document.text = document.text
          .replace(new RegExp(escapeRegExp(encodedPath), "g"), reference)
          .replace(
            new RegExp(`\\\.?/?${escapeRegExp(normalizedAttachmentPath)}`, "g"),
            reference
          );
      }

      const basePath = path.dirname(document.path);

      // check internal document links in the text and replace them with placeholders.
      // When persisting, the placeholders will be replaced with the right urls.
      const internalLinks = [
        ...document.text.matchAll(/\[[^\]]+\]\(([^)]+\.md)\)/g),
      ];

      internalLinks.forEach((match) => {
        const referredDocPath = match[1];
        const normalizedDocPath = decodeURI(
          path.normalize(`${basePath}/${referredDocPath}`)
        );

        const referredDocId = docPathToIdMap.get(normalizedDocPath);
        if (referredDocId) {
          document.text = document.text.replace(
            referredDocPath,
            `<<${referredDocId}>>`
          );
        }
      });
    }

    return output;
  }
}
