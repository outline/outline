import path from "path";
import JSZip from "jszip";
import { find } from "lodash";
import mime from "mime-types";
import { v4 as uuidv4 } from "uuid";
import documentImporter from "@server/commands/documentImporter";
import Logger from "@server/logging/logger";
import { FileOperation, User } from "@server/models";
import ImportTask, { StructuredImportData } from "./ImportTask";

type FileTreeNode = {
  /** The title, extracted from the file name */
  title: string;
  /** The file name including extension */
  name: string;
  /** The full path to within the zip file */
  path: string;
  /** The nested children */
  children: FileTreeNode[];
};

export default class ImportMarkdownZipTask extends ImportTask {
  public async parseData(
    buffer: Buffer,
    fileOperation: FileOperation
  ): Promise<StructuredImportData> {
    const zip = await JSZip.loadAsync(buffer);
    const zipPaths = Object.keys(zip.files).map((filePath) => `/${filePath}`);
    const tree = this.zipAsFileTree(zipPaths);

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
          // special case for folders of attachments
          if (
            child.name === "uploads" ||
            (child.children.length > 0 && child.path.includes("/uploads/"))
          ) {
            return parseNodeChildren(child.children, collectionId);
          }

          const zipObject = zip.files[child.path];
          const id = uuidv4();

          // this is an attachment
          if (child.path.includes("/uploads/") && child.children.length === 0) {
            output.attachments.push({
              id,
              name: child.name,
              path: child.path,
              mimeType: mime.lookup(child.path) || "application/octet-stream",
              buffer: await zipObject.async("nodebuffer"),
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

    return output;
  }

  /**
   * Converts the flat structure returned by JSZIP into a nested file structure
   * for easier processing.
   *
   * @param paths An array of paths to files in the zip
   * @returns
   */
  private zipAsFileTree(paths: string[]) {
    const tree: FileTreeNode[] = [];

    paths.forEach(function (filePath) {
      if (filePath.startsWith("/__MACOSX")) {
        return;
      }

      const pathParts = filePath.split("/");

      // Remove first blank element from the parts array.
      pathParts.shift();

      let currentLevel = tree; // initialize currentLevel to root

      pathParts.forEach(function (name) {
        // check to see if the path already exists.
        const existingPath = find(currentLevel, {
          name,
        });

        if (existingPath) {
          // The path to this item was already in the tree, so don't add again.
          // Set the current level to this path's children
          currentLevel = existingPath.children;
        } else if (name.endsWith(".DS_Store") || !name) {
          return;
        } else {
          const newPart = {
            name,
            path: filePath.replace(/^\//, ""),
            title: path.basename(name),
            children: [],
          };

          currentLevel.push(newPart);
          currentLevel = newPart.children;
        }
      });
    });

    return tree;
  }
}
