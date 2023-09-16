import path from "path";
import JSZip from "jszip";
import compact from "lodash/compact";
import escapeRegExp from "lodash/escapeRegExp";
import mime from "mime-types";
import { v4 as uuidv4 } from "uuid";
import documentImporter from "@server/commands/documentImporter";
import Logger from "@server/logging/Logger";
import { FileOperation, User } from "@server/models";
import ZipHelper, { FileTreeNode } from "@server/utils/ZipHelper";
import ImportTask, { StructuredImportData } from "./ImportTask";

export default class ImportNotionTask extends ImportTask {
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

    const parseNodeChildren = async (
      children: FileTreeNode[],
      collectionId: string,
      parentDocumentId?: string
    ): Promise<void> => {
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
              buffer: () => zipObject.async("nodebuffer"),
              sourceId,
            });
            return;
          }

          Logger.debug("task", `Processing ${name} as ${mimeType}`);

          const { title, emoji, text } = await documentImporter({
            mimeType: mimeType || "text/markdown",
            fileName: name,
            content: zipObject ? await zipObject.async("string") : "",
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
              emoji,
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

    const replaceInternalLinksAndImages = (text: string) => {
      // Find if there are any images in this document
      const imagesInText = this.parseImages(text);

      for (const image of imagesInText) {
        const name = path.basename(image.src);
        const attachment = output.attachments.find(
          (att) =>
            att.path.endsWith(image.src) ||
            encodeURI(att.path).endsWith(image.src)
        );

        if (!attachment) {
          if (!image.src.startsWith("http")) {
            Logger.info(
              "task",
              `Could not find referenced attachment with name ${name} and src ${image.src}`
            );
          }
        } else {
          text = text.replace(
            new RegExp(escapeRegExp(image.src), "g"),
            `<<${attachment.id}>>`
          );
        }
      }

      // With Notion's HTML import, images sometimes come wrapped in anchor tags
      // This isn't supported in Outline's editor, so we need to strip them.
      text = text.replace(/\[!\[([^[]+)]/g, "![]");

      // Find if there are any links in this document pointing to other documents
      const internalLinksInText = this.parseInternalLinks(text);

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
          text = text.replace(link.href, `<<${doc.id}>>`);
        }
      }

      return text;
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

      // Root level docs become the descriptions of collections
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
      document.text = replaceInternalLinksAndImages(document.text);
    }

    for (const collection of output.collections) {
      if (typeof collection.description === "string") {
        collection.description = replaceInternalLinksAndImages(
          collection.description
        );
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
   * Extracts images from the markdown document
   *
   * @param text The markdown text to parse
   * @returns An array of internal links
   */
  private parseImages(text: string): { alt: string; src: string }[] {
    return compact(
      [...text.matchAll(this.ImageRegex)].map((match) => ({
        alt: match[1],
        src: match[2],
      }))
    );
  }

  /**
   * Regex to find markdown images of all types
   */
  private ImageRegex =
    /!\[(?<alt>[^\][]*?)]\((?<filename>[^\][]*?)(?=“|\))“?(?<title>[^\][”]+)?”?\)/g;

  /**
   * Regex to find markdown links containing ID's that look like UUID's with the
   * "-"'s removed, Notion's sourceId format.
   */
  private NotionLinkRegex = /\[([^[]+)]\((.*?([0-9a-fA-F]{32})\..*?)\)/g;

  /**
   * Regex to find Notion document UUID's in the title of a document.
   */
  private NotionUUIDRegex =
    /\s([0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}|[0-9a-fA-F]{32})$/;
}
