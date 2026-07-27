import { ZipFile } from "yazl";
import { omit } from "es-toolkit/compat";
import { errToString } from "@shared/utils/error";
import { determineIconType } from "@shared/utils/icon";
import type { NavigationNode } from "@shared/types";
import { IconType } from "@shared/types";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import type { Collection, FileOperation } from "@server/models";
import { Attachment, Document, Emoji } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { presentAttachment, presentCollection } from "@server/presenters";
import type { CollectionJSONExport, JSONExportMetadata } from "@server/types";
import ZipHelper from "@server/utils/ZipHelper";
import { serializeFilename } from "@server/utils/fs";
import packageJson from "../../../package.json";
import ExportTask from "./ExportTask";

export default class ExportJSONTask extends ExportTask {
  public async exportCollections(
    collections: Collection[],
    fileOperation: FileOperation
  ) {
    const zip = new ZipFile();
    const usedFilenames = new Set<string>();
    // Custom emojis are workspace-wide, so the same image can be referenced
    // from several collections. Keys already in the archive are not written
    // again, though each collection's JSON still describes every attachment it
    // references so it remains importable on its own.
    const archivedKeys = new Set<string>();

    // serial to avoid overloading, slow and steady wins the race
    for (const collection of collections) {
      let filename = serializeFilename(collection.name);
      let i = 0;
      while (usedFilenames.has(filename)) {
        filename = `${serializeFilename(collection.name)} (${++i})`;
      }
      usedFilenames.add(filename);

      await this.addCollectionToArchive(
        zip,
        collection,
        fileOperation.options?.includeAttachments ?? true,
        filename,
        archivedKeys
      );
    }

    await this.addMetadataToArchive(zip, fileOperation);

    return ZipHelper.toTmpFile(zip);
  }

  private async addMetadataToArchive(
    zip: ZipFile,
    fileOperation: FileOperation
  ) {
    const user = await fileOperation.$get("user");

    const metadata: JSONExportMetadata = {
      exportVersion: 1,
      version: packageJson.version,
      createdAt: new Date().toISOString(),
      createdById: fileOperation.userId,
      createdByEmail: user?.email ?? null,
    };

    zip.addBuffer(
      Buffer.from(
        env.isDevelopment
          ? JSON.stringify(metadata, null, 2)
          : JSON.stringify(metadata)
      ),
      `metadata.json`
    );
  }

  private async addCollectionToArchive(
    zip: ZipFile,
    collection: Collection,
    includeAttachments: boolean,
    filename: string,
    archivedKeys: Set<string>
  ) {
    const emojis: NonNullable<CollectionJSONExport["emojis"]> = {};

    const output: CollectionJSONExport = {
      collection: {
        ...(omit(await presentCollection(undefined, collection), [
          "url",
          "description",
        ]) as CollectionJSONExport["collection"]),
        documentStructure: collection.documentStructure,
      },
      documents: {},
      attachments: {},
      emojis,
    };

    // Custom emoji ids referenced by the collection or its documents, either
    // inline in content or as an icon. Resolved once the tree has been walked.
    const emojiIds = new Set<string>();

    function addEmojiIcon(icon?: string | null) {
      if (icon && determineIconType(icon) === IconType.Custom) {
        emojiIds.add(icon);
      }
    }

    async function addAttachments(attachments: Attachment[]) {
      for (const attachment of attachments) {
        if (!archivedKeys.has(attachment.key)) {
          archivedKeys.add(attachment.key);

          let buffer: Buffer;
          try {
            buffer = await attachment.buffer;
          } catch (err) {
            Logger.warn(`Failed to read attachment from storage`, {
              attachmentId: attachment.id,
              teamId: attachment.teamId,
              error: errToString(err),
            });
            buffer = Buffer.from("");
          }
          zip.addBuffer(buffer, attachment.key, {
            mtime: attachment.updatedAt,
          });
        }

        output.attachments[attachment.id] = {
          ...omit(presentAttachment(attachment), "url"),
          key: attachment.key,
        };
      }
    }

    async function addDocumentTree(nodes: NavigationNode[]) {
      for (const node of nodes) {
        const document = await Document.findByPk(node.id, {
          includeState: true,
        });

        if (!document) {
          continue;
        }

        addEmojiIcon(document.icon);
        ProsemirrorHelper.parseEmojiIds(
          DocumentHelper.toProsemirror(document)
        ).forEach((id) => emojiIds.add(id));

        const documentAttachments = includeAttachments
          ? await Attachment.findAll({
              where: {
                teamId: document.teamId,
                id: ProsemirrorHelper.parseAttachmentIds(
                  DocumentHelper.toProsemirror(document)
                ),
              },
            })
          : [];

        await addAttachments(documentAttachments);

        output.documents[document.id] = {
          id: document.id,
          urlId: document.urlId,
          title: document.title,
          icon: document.icon,
          color: document.color,
          data: DocumentHelper.toProsemirror(document).toJSON(),
          createdById: document.createdById,
          createdByName: document.createdBy.name,
          createdByEmail: document.createdBy.email,
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString(),
          publishedAt: document.publishedAt
            ? document.publishedAt.toISOString()
            : null,
          fullWidth: document.fullWidth,
          parentDocumentId: document.parentDocumentId,
        };

        if (node.children?.length > 0) {
          await addDocumentTree(node.children);
        }
      }
    }

    const collectionAttachments = includeAttachments
      ? await Attachment.findAll({
          where: {
            teamId: collection.teamId,
            id: ProsemirrorHelper.parseAttachmentIds(
              DocumentHelper.toProsemirror(collection)
            ),
          },
        })
      : [];

    await addAttachments(collectionAttachments);

    addEmojiIcon(collection.icon);
    ProsemirrorHelper.parseEmojiIds(
      DocumentHelper.toProsemirror(collection)
    ).forEach((id) => emojiIds.add(id));

    if (collection.documentStructure) {
      await addDocumentTree(collection.documentStructure);
    }

    // Custom emoji images live outside the document content, so they're only
    // resolvable once every referencing document has been visited.
    if (includeAttachments && emojiIds.size) {
      const referenced = await Emoji.findAll({
        where: {
          teamId: collection.teamId,
          id: [...emojiIds],
        },
        include: [{ model: Attachment, as: "attachment", paranoid: false }],
      });

      await addAttachments(
        referenced.map((emoji) => emoji.attachment).filter(Boolean)
      );

      for (const emoji of referenced) {
        if (emoji.attachment) {
          emojis[emoji.id] = {
            id: emoji.id,
            name: emoji.name,
            attachmentId: emoji.attachmentId,
          };
        }
      }
    }

    zip.addBuffer(
      Buffer.from(
        env.isDevelopment
          ? JSON.stringify(output, null, 2)
          : JSON.stringify(output)
      ),
      `${filename}.json`
    );
  }

  public async exportDocument(): Promise<string> {
    throw new Error("JSON export unsupported for individual document.");
  }
}
