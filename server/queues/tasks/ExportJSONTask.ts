import JSZip from "jszip";
import omit from "lodash/omit";
import { NavigationNode } from "@shared/types";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import {
  Attachment,
  Collection,
  Document,
  FileOperation,
} from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { presentAttachment, presentCollection } from "@server/presenters";
import { CollectionJSONExport, JSONExportMetadata } from "@server/types";
import ZipHelper from "@server/utils/ZipHelper";
import { serializeFilename } from "@server/utils/fs";
import packageJson from "../../../package.json";
import ExportTask from "./ExportTask";

export default class ExportJSONTask extends ExportTask {
  public async export(collections: Collection[], fileOperation: FileOperation) {
    const zip = new JSZip();

    // serial to avoid overloading, slow and steady wins the race
    for (const collection of collections) {
      await this.addCollectionToArchive(
        zip,
        collection,
        fileOperation.options?.includeAttachments ?? true
      );
    }

    await this.addMetadataToArchive(zip, fileOperation);

    return ZipHelper.toTmpFile(zip);
  }

  private async addMetadataToArchive(zip: JSZip, fileOperation: FileOperation) {
    const user = await fileOperation.$get("user");

    const metadata: JSONExportMetadata = {
      exportVersion: 1,
      version: packageJson.version,
      createdAt: new Date().toISOString(),
      createdById: fileOperation.userId,
      createdByEmail: user?.email ?? null,
    };

    zip.file(
      `metadata.json`,
      env.isDevelopment
        ? JSON.stringify(metadata, null, 2)
        : JSON.stringify(metadata)
    );
  }

  private async addCollectionToArchive(
    zip: JSZip,
    collection: Collection,
    includeAttachments: boolean
  ) {
    const output: CollectionJSONExport = {
      collection: {
        ...omit(await presentCollection(undefined, collection), [
          "url",
          "description",
        ]),
        documentStructure: collection.documentStructure,
      },
      documents: {},
      attachments: {},
    };

    async function addDocumentTree(nodes: NavigationNode[]) {
      for (const node of nodes) {
        const document = await Document.findByPk(node.id, {
          includeState: true,
        });

        if (!document) {
          continue;
        }

        const attachments = includeAttachments
          ? await Attachment.findAll({
              where: {
                teamId: document.teamId,
                id: ProsemirrorHelper.parseAttachmentIds(
                  DocumentHelper.toProsemirror(document)
                ),
              },
            })
          : [];

        await Promise.all(
          attachments.map(async (attachment) => {
            zip.file(
              attachment.key,
              new Promise<Buffer>((resolve) => {
                attachment.buffer.then(resolve).catch((err) => {
                  Logger.warn(`Failed to read attachment from storage`, {
                    attachmentId: attachment.id,
                    teamId: attachment.teamId,
                    error: err.message,
                  });
                  resolve(Buffer.from(""));
                });
              }),
              {
                date: attachment.updatedAt,
                createFolders: true,
              }
            );

            output.attachments[attachment.id] = {
              ...omit(presentAttachment(attachment), "url"),
              key: attachment.key,
            };
          })
        );

        output.documents[document.id] = {
          id: document.id,
          urlId: document.urlId,
          title: document.title,
          icon: document.icon,
          color: document.color,
          data: DocumentHelper.toProsemirror(document),
          createdById: document.createdById,
          createdByName: document.createdBy.name,
          createdByEmail: document.createdBy.email,
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString(),
          publishedAt: document.publishedAt
            ? document.publishedAt.toISOString()
            : null,
          fullWidth: document.fullWidth,
          template: document.template,
          parentDocumentId: document.parentDocumentId,
        };

        if (node.children?.length > 0) {
          await addDocumentTree(node.children);
        }
      }
    }

    if (collection.documentStructure) {
      await addDocumentTree(collection.documentStructure);
    }

    zip.file(
      `${serializeFilename(collection.name)}.json`,
      env.isDevelopment
        ? JSON.stringify(output, null, 2)
        : JSON.stringify(output)
    );
  }
}
