import path from "path";
import fs from "fs-extra";
import escapeRegExp from "lodash/escapeRegExp";
import mime from "mime-types";
import { randomUUID } from "crypto";
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

    const pathToIdMap = new Map<string, string>();

    const isDocumentNode = (node: FileTreeNode): boolean => {
      // Folders are not document nodes in this context
      if (node.children.length > 0) {
        return false;
      }
      const mimeType = mime.lookup(node.path) || "application/octet-stream";
      return (
        [
          "text/markdown",
          "text/x-markdown",
          "text/html",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/msword",
          "text/csv",
          "text/plain",
        ].includes(mimeType) ||
        node.path.endsWith(".md") ||
        node.path.endsWith(".markdown")
      );
    };

    const hasDocument = (node: FileTreeNode): boolean => {
      if (isDocumentNode(node)) {
        return true;
      }
      return node.children.some(hasDocument);
    };

    async function parseNodeChildren(
      children: FileTreeNode[],
      collectionId?: string,
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
            return parseNodeChildren(
              child.children,
              collectionId,
              parentDocumentId
            );
          }

          const id = randomUUID();
          const mimeType = mime.lookup(child.path) || "application/octet-stream";
          const isDoc = isDocumentNode(child);

          // this is an attachment
          if (child.children.length === 0 && !isDoc) {
            output.attachments.push({
              id,
              name: child.name,
              path: child.path,
              mimeType,
              buffer: () => fs.readFile(child.path),
            });
            pathToIdMap.set(child.path, id);
            return;
          }

          // if no collectionId, we can't create a document
          if (!collectionId) {
            if (child.children.length > 0) {
              await parseNodeChildren(child.children, undefined);
            }
            return;
          }

          // If it's a folder, only create a document if it or its children contain a markdown file
          if (child.children.length > 0 && !hasDocument(child)) {
            return parseNodeChildren(
              child.children,
              collectionId,
              parentDocumentId
            );
          }

          const { title, icon, text } = await sequelize.transaction(
            async (transaction) =>
              documentImporter({
                mimeType: child.children.length > 0 ? "text/markdown" : mimeType,
                fileName: child.name,
                content:
                  child.children.length > 0 ? "" : await fs.readFile(child.path),
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

          if (existingDocument) {
            pathToIdMap.set(child.path, existingDocument.id);

            if (existingDocument.text === "" && text !== "") {
              output.documents[existingDocumentIndex].text = text;
            }

            if (child.children.length > 0) {
              await parseNodeChildren(
                child.children,
                collectionId,
                existingDocument.id
              );
            }
          } else {
            pathToIdMap.set(child.path, id);

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

            if (child.children.length > 0) {
              await parseNodeChildren(child.children, collectionId, id);
            }
          }
        })
      );
    }

    const standaloneNodes = tree.filter((node) => node.children.length === 0);
    const folderNodes = tree.filter((node) => node.children.length > 0);

    // 1. Identify standalone documents at root
    const standaloneDocuments = standaloneNodes.filter(isDocumentNode);
    if (standaloneDocuments.length > 0) {
      const collectionId = randomUUID();
      output.collections.push({
        id: collectionId,
        name: "Imported",
      });
      await parseNodeChildren(standaloneNodes, collectionId);
    } else {
      // Process root files as attachments if no docs at root
      await parseNodeChildren(standaloneNodes, undefined);
    }

    // 2. Process root folders
    for (const node of folderNodes) {
      if (node.name === Buckets.uploads || node.name === Buckets.public) {
        await parseNodeChildren(node.children, undefined);
        continue;
      }

      if (hasDocument(node)) {
        const collectionId = randomUUID();
        output.collections.push({
          id: collectionId,
          name: node.title,
        });
        // Original behavior: root folder children go to root of collection
        await parseNodeChildren(node.children, collectionId);
      } else {
        // Asset-only folder, process children as attachments
        await parseNodeChildren(node.children, undefined);
      }
    }

    // Link resolution
    for (const document of output.documents) {
      const basePath = path.dirname(document.path);

      // Resolve attachments
      for (const attachment of output.attachments) {
        const encodedPath = encodeURI(attachment.path);
        const normalizedAttachmentPath = encodedPath
          .replace(new RegExp(`(.*)/${Buckets.uploads}/`), `${Buckets.uploads}/`)
          .replace(new RegExp(`(.*)/${Buckets.public}/`), `${Buckets.public}/`);

        const reference = `<<${attachment.id}>>`;
        document.text = document.text
          .replace(new RegExp(escapeRegExp(encodedPath), "g"), reference)
          .replace(
            new RegExp(`\\\.?/?${escapeRegExp(normalizedAttachmentPath)}`, "g"),
            reference
          );
      }

      // Resolve internal links
      const links = [...document.text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)];

      links.forEach((match) => {
        const referredPath = match[1];

        if (
          referredPath.startsWith("http") ||
          referredPath.startsWith("mailto:") ||
          referredPath.startsWith("#") ||
          referredPath.startsWith("<<")
        ) {
          return;
        }

        const [referredPathWithoutQuery] = referredPath.split(/[?#]/);
        const normalizedPath = decodeURI(
          path.normalize(path.join(basePath, referredPathWithoutQuery))
        );

        const referredId = pathToIdMap.get(normalizedPath);
        if (referredId) {
          document.text = document.text.replace(
            new RegExp(escapeRegExp(referredPath), "g"),
            `<<${referredId}>>`
          );
        }
      });
    }

    return output;
  }
}
