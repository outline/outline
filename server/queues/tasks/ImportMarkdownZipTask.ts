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
   * Converts a file tree structure into Outline's data model (collections, documents, attachments).
   * 
   * Key behaviors:
   * - Root-level markdown files are placed in an "Imported" collection
   * - Root-level folders become collections (if they contain documents)
   * - Asset-only folders (images/, uploads/) don't create empty documents
   * - Relative links between files are resolved to internal IDs
   *
   * @param fileOperation The import operation context
   * @param tree Array of file tree nodes from the ZIP root
   * @returns Structured data ready for persistence
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

    // Maps file paths to generated IDs for link resolution
    const pathToIdMap = new Map<string, string>();

    // ===== Helper Functions =====

    /**
     * Determines if a node represents a document file (vs. folder or attachment).
     * Only leaf nodes (no children) with document MIME types qualify.
     */
    const isDocumentNode = (node: FileTreeNode): boolean => {
      if (node.children.length > 0) {
        return false; // Folders are not documents
      }

      const mimeType = mime.lookup(node.path) || "application/octet-stream";
      const documentMimeTypes = [
        "text/markdown",
        "text/x-markdown",
        "text/html",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/csv",
        "text/plain",
      ];

      return (
        documentMimeTypes.includes(mimeType) ||
        node.path.endsWith(".md") ||
        node.path.endsWith(".markdown")
      );
    };

    /**
     * Recursively checks if a node or any of its descendants contain documents.
     * Used to avoid creating collections for asset-only folders.
     */
    const hasDocument = (node: FileTreeNode): boolean => {
      if (isDocumentNode(node)) {
        return true;
      }
      return node.children.some(hasDocument);
    };

    /**
     * Checks if a node is a technical bucket folder (uploads/, public/).
     * These folders should be transparent - their contents become attachments
     * without creating document hierarchy.
     */
    const isBucketFolder = (node: FileTreeNode): boolean => {
      return (
        node.name === Buckets.uploads ||
        node.name === Buckets.public ||
        (node.children.length > 0 &&
          (node.path.includes(`/${Buckets.public}/`) ||
            node.path.includes(`/${Buckets.uploads}/`)))
      );
    };

    /**
     * Creates a document or attachment from a node and adds it to output.
     * Handles merging when a file and folder share the same name.
     */
    const processDocumentNode = async (
      child: FileTreeNode,
      collectionId: string,
      parentDocumentId?: string
    ): Promise<void> => {
      const id = randomUUID();
      const isFolder = child.children.length > 0;

      // Import the document content (folders get empty content initially)
      const { title, icon, text } = await sequelize.transaction(
        async (transaction) =>
          documentImporter({
            mimeType: isFolder ? "text/markdown" : mime.lookup(child.path) || "application/octet-stream",
            fileName: child.name,
            content: isFolder ? "" : await fs.readFile(child.path),
            user,
            ctx: createContext({ user, transaction }),
          })
      );

      // Check if a document with this title already exists at this location
      // (can happen when both a file and folder have the same name)
      const existingDocIndex = output.documents.findIndex(
        (doc) =>
          doc.title === title &&
          doc.collectionId === collectionId &&
          doc.parentDocumentId === parentDocumentId
      );

      const existingDoc = output.documents[existingDocIndex];

      if (existingDoc) {
        // Merge: use the existing document's ID for path mapping
        pathToIdMap.set(child.path, existingDoc.id);

        // Update empty content with actual file content if available
        if (existingDoc.text === "" && text !== "") {
          output.documents[existingDocIndex].text = text;
        }

        // Process children under the existing document
        if (isFolder) {
          await parseNodeChildren(child.children, collectionId, existingDoc.id);
        }
      } else {
        // Create new document
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

        // Process children under this new document
        if (isFolder) {
          await parseNodeChildren(child.children, collectionId, id);
        }
      }
    };

    /**
     * Recursively processes a list of file tree nodes.
     * 
     * @param children Nodes to process
     * @param collectionId Collection to add documents to (undefined = attachments only)
     * @param parentDocumentId Parent document for nested structure
     */
    async function parseNodeChildren(
      children: FileTreeNode[],
      collectionId?: string,
      parentDocumentId?: string
    ): Promise<void> {
      await Promise.all(
        children.map(async (child) => {
          // Skip technical bucket folders - just process their children
          if (isBucketFolder(child)) {
            return parseNodeChildren(
              child.children,
              collectionId,
              parentDocumentId
            );
          }

          const id = randomUUID();
          const isDoc = isDocumentNode(child);
          const isFolder = child.children.length > 0;

          // Case 1: Attachment (non-document file)
          if (!isFolder && !isDoc) {
            output.attachments.push({
              id,
              name: child.name,
              path: child.path,
              mimeType: mime.lookup(child.path) || "application/octet-stream",
              buffer: () => fs.readFile(child.path),
            });
            pathToIdMap.set(child.path, id);
            return;
          }

          // Case 2: No collection context - can't create documents
          // (this happens for root attachments or bucket folder contents)
          if (!collectionId) {
            if (isFolder) {
              await parseNodeChildren(child.children, undefined);
            }
            return;
          }

          // Case 3: Asset-only folder - skip document creation
          if (isFolder && !hasDocument(child)) {
            return parseNodeChildren(
              child.children,
              collectionId,
              parentDocumentId
            );
          }

          // Case 4: Document or folder with documents - create the document
          await processDocumentNode(child, collectionId, parentDocumentId);
        })
      );
    }

    // ===== Main Processing Logic =====

    const standaloneFiles = tree.filter((node) => node.children.length === 0);
    const rootFolders = tree.filter((node) => node.children.length > 0);

    // Step 1: Handle standalone files at ZIP root
    const rootDocuments = standaloneFiles.filter(isDocumentNode);
    if (rootDocuments.length > 0) {
      // Create "Imported" collection for orphan documents
      const collectionId = randomUUID();
      output.collections.push({
        id: collectionId,
        name: "Imported",
      });
      await parseNodeChildren(standaloneFiles, collectionId);
    } else {
      // No documents at root - treat all root files as attachments
      await parseNodeChildren(standaloneFiles, undefined);
    }

    // Step 2: Process root folders into collections
    for (const folder of rootFolders) {
      // Skip technical bucket folders at root level
      if (folder.name === Buckets.uploads || folder.name === Buckets.public) {
        await parseNodeChildren(folder.children, undefined);
        continue;
      }

      // Only create collection if folder contains documents
      if (hasDocument(folder)) {
        const collectionId = randomUUID();
        output.collections.push({
          id: collectionId,
          name: folder.title,
        });
        await parseNodeChildren(folder.children, collectionId);
      } else {
        // Asset-only folder - process as attachments
        await parseNodeChildren(folder.children, undefined);
      }
    }

    // Step 3: Resolve all relative links to internal IDs
    this.resolveLinks(output, pathToIdMap);

    return output;
  }

  /**
   * Resolves relative links in documents to internal Outline references.
   * Converts markdown links like `[Doc](../other.md)` to `[Doc](<<id>>)`
   * and image references like `![](images/pic.png)` to `![](<<id>>)`.
   */
  private resolveLinks(
    output: StructuredImportData,
    pathToIdMap: Map<string, string>
  ): void {
    for (const document of output.documents) {
      const documentDir = path.dirname(document.path);

      // Replace attachment references
      for (const attachment of output.attachments) {
        const encodedPath = encodeURI(attachment.path);

        // Normalize bucket paths (remove collection prefix for bucket items)
        const normalizedPath = encodedPath
          .replace(new RegExp(`(.*)/${Buckets.uploads}/`), `${Buckets.uploads}/`)
          .replace(new RegExp(`(.*)/${Buckets.public}/`), `${Buckets.public}/`);

        const reference = `<<${attachment.id}>>`;

        // Replace both full and normalized paths
        document.text = document.text
          .replace(new RegExp(escapeRegExp(encodedPath), "g"), reference)
          .replace(
            new RegExp(`\\\.?/?${escapeRegExp(normalizedPath)}`, "g"),
            reference
          );
      }

      // Replace document link references
      const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
      const links = [...document.text.matchAll(linkPattern)];

      for (const match of links) {
        const linkPath = match[1];

        // Skip external links and anchors
        const isExternal =
          linkPath.startsWith("http") ||
          linkPath.startsWith("mailto:") ||
          linkPath.startsWith("#") ||
          linkPath.startsWith("<<"); // Already resolved

        if (isExternal) {
          continue;
        }

        // Remove query params and anchors for path resolution
        const [cleanPath] = linkPath.split(/[?#]/);

        // Resolve relative path from document's directory
        const absolutePath = path.normalize(
          path.join(documentDir, decodeURI(cleanPath))
        );

        // Replace with internal reference if target exists
        const targetId = pathToIdMap.get(absolutePath);
        if (targetId) {
          document.text = document.text.replace(
            new RegExp(escapeRegExp(linkPath), "g"),
            `<<${targetId}>>`
          );
        }
      }
    }
  }
}
