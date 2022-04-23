import path from "path";
import JSZip from "jszip";
import { compact } from "lodash";
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
          const sourceId = match ? match[0].trim() : undefined;

          // If it's not a text file we're going to treat it as an attachment.
          const mimeType = mime.lookup(child.name);
          const isDocument =
            mimeType === "text/markdown" ||
            mimeType === "text/plain" ||
            mimeType === "text/html";

          // If it's not a document and not a folder, treat it as an attachment
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

          // If there is an existing document with the same sourceId that means
          // we've already parsed either a folder or a file referencing the same
          // document, as such we should merge.
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
      const sourceId = match ? match[0].trim() : undefined;
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

    for (const document of output.documents) {
      // Check all of the attachments we've created against urls in the text
      // and replace them out with attachment redirect urls before continuing.
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

      // Find if there are any links in this document pointing to other documents
      const internalLinksInText = this.parseInternalLinks(document.text);

      // For each link update to the standardized format of <<documentId>>
      // instead of a relative or absolute URL within the original zip file.
      for (const link of internalLinksInText) {
        const doc = output.documents.find(
          (doc) => doc.sourceId === link.sourceId
        );

        if (!doc) {
          Logger.info(
            "task",
            `Could not find referenced document with sourceId ${link.sourceId}`
          );
        } else {
          document.text = document.text.replace(link.href, `<<${doc.id}>>`);
        }
      }
    }

    return output;
  }

  /**
   * Extracts internal links from a markdown document, taking into account the
   * sourceId of the document, which is part of the link title.
   *
   * @param text The markdown text to parse
   * @returns An array of internal links
   */
  private parseInternalLinks(
    text: string
  ): { title: string; href: string; sourceId: string }[] {
    return compact(
      [...text.matchAll(this.NotionLinkRegex)].map((match) => ({
        title: match[1],
        href: match[2],
        sourceId: match[3],
      }))
    );
  }

  /**
   * Regex to find markdown links containing ID's that look like UUID's with the
   * "-"'s removed, Notion's sourceId format.
   */
  private NotionLinkRegex = /\[([^[]+)]\((.*([0-9a-fA-F]{32})\..*)\)/g;

  /**
   * Regex to find Notion document UUID's in the title of a document.
   */
  private NotionUUIDRegex = /\s([0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}|[0-9a-fA-F]{32})$/;
}
