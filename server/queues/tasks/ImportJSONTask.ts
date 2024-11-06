import path from "path";
import fs from "fs-extra";
import find from "lodash/find";
import mime from "mime-types";
import { Fragment, Node } from "prosemirror-model";
import { v4 as uuidv4 } from "uuid";
import { ProsemirrorData } from "@shared/types";
import { schema, serializer } from "@server/editor";
import Logger from "@server/logging/Logger";
import { Attachment, FileOperation } from "@server/models";
import {
  AttachmentJSONExport,
  CollectionJSONExport,
  DocumentJSONExport,
  JSONExportMetadata,
} from "@server/types";
import ImportHelper, { FileTreeNode } from "@server/utils/ImportHelper";
import ImportTask, { StructuredImportData } from "./ImportTask";

export default class ImportJSONTask extends ImportTask {
  public async parseData(
    dirPath: string,
    _: FileOperation
  ): Promise<StructuredImportData> {
    const tree = await ImportHelper.toFileTree(dirPath);
    if (!tree) {
      throw new Error("Could not find valid content in zip file");
    }
    return this.parseFileTree(tree.children);
  }

  /**
   * Converts the file structure from zipAsFileTree into documents,
   * collections, and attachments.
   *
   * @param tree An array of FileTreeNode representing root files in the zip
   * @returns A StructuredImportData object
   */
  private async parseFileTree(
    tree: FileTreeNode[]
  ): Promise<StructuredImportData> {
    let rootPath = "";
    const output: StructuredImportData = {
      collections: [],
      documents: [],
      attachments: [],
    };

    // Load metadata
    let metadata: JSONExportMetadata | undefined = undefined;
    for (const node of tree) {
      if (!rootPath) {
        rootPath = path.dirname(node.path);
      }
      if (node.path === "metadata.json") {
        try {
          metadata = JSON.parse(await fs.readFile(node.path, "utf8"));
        } catch (err) {
          throw new Error(`Could not parse metadata.json. ${err.message}`);
        }
      }
    }

    if (!rootPath) {
      throw new Error("Could not find root path");
    }

    Logger.debug("task", "Importing JSON metadata", { metadata });

    function mapDocuments(
      documents: { [id: string]: DocumentJSONExport },
      collectionId: string
    ) {
      Object.values(documents).forEach((node) => {
        const id = uuidv4();
        output.documents.push({
          ...node,
          path: "",
          // populate text to maintain consistency with existing data.
          // moving forward, `data` field will be used.
          text: serializer.serialize(Node.fromJSON(schema, node.data)),
          data: node.data,
          icon: node.icon ?? node.emoji,
          color: node.color,
          createdAt: node.createdAt ? new Date(node.createdAt) : undefined,
          updatedAt: node.updatedAt ? new Date(node.updatedAt) : undefined,
          publishedAt: node.publishedAt ? new Date(node.publishedAt) : null,
          collectionId,
          externalId: node.id,
          mimeType: "application/json",
          parentDocumentId: node.parentDocumentId
            ? find(
                output.documents,
                (d) => d.externalId === node.parentDocumentId
              )?.id
            : null,
          id,
        });
      });
    }

    async function mapAttachments(attachments: {
      [id: string]: AttachmentJSONExport;
    }) {
      Object.values(attachments).forEach((node) => {
        const id = uuidv4();
        const mimeType = mime.lookup(node.key) || "application/octet-stream";

        output.attachments.push({
          id,
          name: node.name,
          buffer: () => fs.readFile(path.join(rootPath, node.key)),
          mimeType,
          path: node.key,
          externalId: node.id,
        });
      });
    }

    // All nodes in the root level should be collections as JSON + metadata
    for (const node of tree) {
      if (node.children.length > 0 || node.path.endsWith("metadata.json")) {
        continue;
      }

      let item: CollectionJSONExport;
      try {
        item = JSON.parse(await fs.readFile(node.path, "utf8"));
      } catch (err) {
        throw new Error(`Could not parse ${node.path}. ${err.message}`);
      }

      const collectionId = uuidv4();
      const data = item.collection.description ?? item.collection.data;

      output.collections.push({
        ...item.collection,
        description:
          data && typeof data === "object"
            ? serializer.serialize(Node.fromJSON(schema, data))
            : data,
        id: collectionId,
        externalId: item.collection.id,
      });

      if (Object.values(item.documents).length) {
        mapDocuments(item.documents, collectionId);
      }

      if (Object.values(item.attachments).length) {
        await mapAttachments(item.attachments);
      }
    }

    // Check all of the attachments we've created against urls and
    // replace them with the correct redirect urls before continuing.
    if (output.attachments.length) {
      this.replaceAttachmentURLs(output);
    }

    return output;
  }

  private replaceAttachmentURLs(output: StructuredImportData) {
    const attachmentTypes = ["attachment", "image", "video"];
    const urlRegex = /\/api\/attachments.redirect\?id=(.+)/;

    const attachmentExternalIdMap = output.attachments.reduce(
      (obj, attachment) => {
        if (attachment.externalId) {
          obj[attachment.externalId] = attachment;
        }
        return obj;
      },
      {} as Record<string, StructuredImportData["attachments"][number]>
    );

    const getRedirectPath = (existingPath?: string): string | undefined => {
      if (!existingPath) {
        return;
      }

      const match = existingPath.match(urlRegex);
      if (!match) {
        return existingPath;
      }

      const attachment = attachmentExternalIdMap[match[1]];
      // maintain the existing behaviour of using existingPath when attachment id is not present.
      return attachment
        ? Attachment.getRedirectUrl(attachment.id)
        : existingPath;
    };

    const transformAttachmentNode = (node: Node): Node => {
      const json = node.toJSON() as ProsemirrorData;
      const attrs = json.attrs ?? {};

      if (node.type.name === "attachment") {
        // attachment node uses 'href' attribute
        attrs.href = getRedirectPath(attrs.href as string);
      } else if (node.type.name === "image" || node.type.name === "video") {
        // image & video nodes use 'src' attribute
        attrs.src = getRedirectPath(attrs.src as string);
      }

      json.attrs = attrs;
      return Node.fromJSON(schema, json);
    };

    const transformFragment = (fragment: Fragment): Fragment => {
      const nodes: Node[] = [];

      fragment.forEach((node) => {
        nodes.push(
          attachmentTypes.includes(node.type.name)
            ? transformAttachmentNode(node)
            : node.copy(transformFragment(node.content))
        );
      });

      return Fragment.fromArray(nodes);
    };

    for (const document of output.documents) {
      const node = Node.fromJSON(schema, document.data);
      const transformedNode = node.copy(transformFragment(node.content));
      document.data = transformedNode;
      document.text = serializer.serialize(transformedNode);
    }
  }
}
