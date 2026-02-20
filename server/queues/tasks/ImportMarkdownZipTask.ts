import path from "node:path";
import fs from "fs-extra";
import escapeRegExp from "lodash/escapeRegExp";
import mime from "mime-types";
import { randomUUID } from "node:crypto";
import documentImporter from "@server/commands/documentImporter";
import { createContext } from "@server/context";
import Logger from "@server/logging/Logger";
import type { FileOperation } from "@server/models";
import { User } from "@server/models";
import { Buckets } from "@server/models/helpers/AttachmentHelper";
import { sequelize } from "@server/storage/database";
import type { FileTreeNode } from "@server/utils/ImportHelper";
import ImportHelper from "@server/utils/ImportHelper";
import type { StructuredImportData } from "./ImportTask";
import ImportTask from "./ImportTask";

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
   * Check if a folder contains only attachment files (no markdown documents).
   *
   * @param node The file tree node to check
   * @returns true if the folder contains only non-markdown files
   */
  private isAttachmentFolder(node: FileTreeNode): boolean {
    if (node.children.length === 0) {
      return false;
    }

    return node.children.every((child) => {
      // If child has children, it's a folder - recurse to check its contents
      if (child.children.length > 0) {
        return this.isAttachmentFolder(child);
      }

      // Child has no children - could be a file or empty folder
      const ext = path.extname(child.name).toLowerCase();

      // If no extension, it's likely an empty folder, not a file.
      // Be conservative and don't treat it as an attachment.
      if (!ext) {
        return false;
      }

      // It's a file with an extension - check if it's NOT markdown
      return ext !== ".md" && ext !== ".markdown";
    });
  }

  /**
   * Recursively process all files in a folder as attachments.
   *
   * @param node The file tree node to process
   * @param output The structured import data to add attachments to
   */
  private parseAttachmentFolder(
    node: FileTreeNode,
    output: StructuredImportData
  ): void {
    for (const child of node.children) {
      if (child.children.length > 0) {
        this.parseAttachmentFolder(child, output);
      } else {
        const id = randomUUID();
        output.attachments.push({
          id,
          name: child.name,
          path: child.path,
          mimeType: mime.lookup(child.path) || "application/octet-stream",
          buffer: () => fs.readFile(child.path),
        });
      }
    }
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

    const parseNodeChildren = async (
      children: FileTreeNode[],
      collectionId: string,
      parentDocumentId?: string
    ): Promise<void> => {
      await Promise.all(
        children.map(async (child) => {
          // special case for folders of attachments - detect by content
          if (child.children.length > 0 && this.isAttachmentFolder(child)) {
            this.parseAttachmentFolder(child, output);
            return;
          }

          const id = randomUUID();

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
    };

    // All nodes in the root level should be collections
    for (const node of tree) {
      if (node.children.length > 0) {
        // Check if this is an attachments-only folder at root level
        if (this.isAttachmentFolder(node)) {
          this.parseAttachmentFolder(node, output);
          continue;
        }

        const collectionId = randomUUID();
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
        const attachmentFileName = path.basename(attachment.path);
        const reference = `<<${attachment.id}>>`;

        // Pull the collection and subdirectory out of the path name, upload
        // folders in an export are relative to the document itself.
        // Support both legacy bucket names (uploads/public) and generic attachment folders.
        let normalizedAttachmentPath = encodedPath
          .replace(
            new RegExp(`(.*)/${Buckets.uploads}/`),
            `${Buckets.uploads}/`
          )
          .replace(new RegExp(`(.*)/${Buckets.public}/`), `${Buckets.public}/`);

        // Also try normalizing to just the folder containing the attachment
        // This handles arbitrary folder names like "attachments/"
        const attachmentDir = path.basename(path.dirname(attachment.path));
        const genericNormalizedPath = `${attachmentDir}/${encodeURI(attachmentFileName)}`;

        document.text = document.text
          .replace(new RegExp(escapeRegExp(encodedPath), "g"), reference)
          .replace(
            new RegExp(`\\\.?/?${escapeRegExp(normalizedAttachmentPath)}`, "g"),
            reference
          )
          .replace(
            new RegExp(`\\\.?/?${escapeRegExp(genericNormalizedPath)}`, "g"),
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
