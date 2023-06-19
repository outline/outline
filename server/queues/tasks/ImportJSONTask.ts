import JSZip from "jszip";
import { escapeRegExp, find } from "lodash";
import mime from "mime-types";
import { Node } from "prosemirror-model";
import { v4 as uuidv4 } from "uuid";
import { schema, serializer } from "@server/editor";
import Logger from "@server/logging/Logger";
import { FileOperation } from "@server/models";
import {
  AttachmentJSONExport,
  CollectionJSONExport,
  DocumentJSONExport,
  JSONExportMetadata,
} from "@server/types";
import ZipHelper, { FileTreeNode } from "@server/utils/ZipHelper";
import ImportTask, { StructuredImportData } from "./ImportTask";

export default class ImportJSONTask extends ImportTask {
  public async parseData(
    buffer: Buffer,
    fileOperation: FileOperation
  ): Promise<StructuredImportData> {
    const zip = await JSZip.loadAsync(buffer);
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
  }: {
    zip: JSZip;
    fileOperation: FileOperation;
    tree: FileTreeNode[];
  }): Promise<StructuredImportData> {
    const output: StructuredImportData = {
      collections: [],
      documents: [],
      attachments: [],
    };

    // Load metadata
    let metadata: JSONExportMetadata | undefined = undefined;
    for (const node of tree) {
      if (node.path === "metadata.json") {
        const zipObject = zip.files["metadata.json"];
        metadata = JSON.parse(await zipObject.async("string"));
      }
    }

    Logger.debug("task", "Importing JSON metadata", { metadata });

    function mapDocuments(
      documents: { [id: string]: DocumentJSONExport },
      collectionId: string
    ) {
      Object.values(documents).forEach(async (node) => {
        const id = uuidv4();
        output.documents.push({
          ...node,
          path: "",
          // TODO: This is kind of temporary, we can import the document
          // structure directly in the future.
          text: serializer.serialize(Node.fromJSON(schema, node.data)),
          createdAt: node.createdAt ? new Date(node.createdAt) : undefined,
          updatedAt: node.updatedAt ? new Date(node.updatedAt) : undefined,
          publishedAt: node.publishedAt ? new Date(node.publishedAt) : null,
          collectionId,
          sourceId: node.id,
          parentDocumentId: node.parentDocumentId
            ? find(
                output.documents,
                (d) => d.sourceId === node.parentDocumentId
              )?.id
            : null,
          id,
        });
      });
    }

    async function mapAttachments(attachments: {
      [id: string]: AttachmentJSONExport;
    }) {
      Object.values(attachments).forEach(async (node) => {
        const id = uuidv4();
        const zipObject = zip.files[node.key];
        const mimeType = mime.lookup(node.key) || "application/octet-stream";

        output.attachments.push({
          id,
          name: node.name,
          buffer: () => zipObject.async("nodebuffer"),
          mimeType,
          path: node.key,
          sourceId: node.id,
        });
      });
    }

    // All nodes in the root level should be collections as JSON + metadata
    for (const node of tree) {
      if (
        node.path.endsWith("/") ||
        node.path === ".DS_Store" ||
        node.path === "metadata.json"
      ) {
        continue;
      }

      const zipObject = zip.files[node.path];
      const item: CollectionJSONExport = JSON.parse(
        await zipObject.async("string")
      );

      const collectionId = uuidv4();
      output.collections.push({
        ...item.collection,
        description:
          item.collection.description &&
          typeof item.collection.description === "object"
            ? serializer.serialize(
                Node.fromJSON(schema, item.collection.description)
              )
            : item.collection.description,
        id: collectionId,
        sourceId: item.collection.id,
      });

      if (Object.values(item.documents).length) {
        await mapDocuments(item.documents, collectionId);
      }

      if (Object.values(item.attachments).length) {
        await mapAttachments(item.attachments);
      }
    }

    // Check all of the attachments we've created against urls in the text
    // and replace them out with attachment redirect urls before continuing.
    for (const document of output.documents) {
      for (const attachment of output.attachments) {
        const encodedPath = encodeURI(
          `/api/attachments.redirect?id=${attachment.sourceId}`
        );

        document.text = document.text.replace(
          new RegExp(escapeRegExp(encodedPath), "g"),
          `<<${attachment.id}>>`
        );
      }
    }

    return output;
  }
}
