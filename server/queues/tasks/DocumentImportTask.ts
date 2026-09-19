import { errToString } from "@shared/utils/error";
import type { SourceMetadata } from "@shared/types";
import documentCreator from "@server/commands/documentCreator";
import documentImporter from "@server/commands/documentImporter";
import { createContext } from "@server/context";
import { InvalidRequestError } from "@server/errors";
import { Document, User } from "@server/models";
import FileStorage from "@server/storage/files";
import { sequelize } from "@server/storage/database";
import type { AuthenticationType } from "@server/types";
import { BaseTask, TaskPriority } from "./base/BaseTask";

type Props = {
  userId: string;
  /** The content to import, for callers that hold it in memory. */
  content?: string;
  /** The file storage key the content is staged under, removed once imported. */
  key?: string;
  /** Name and mime type of the content, recorded on the created document. */
  sourceMetadata: Pick<Required<SourceMetadata>, "fileName" | "mimeType">;
  /** Attributes for the created document, taking precedence over those derived from the content. */
  attributes?: {
    title?: string;
    icon?: string;
    color?: string;
    fullWidth?: boolean;
  };
  publish?: boolean;
  collectionId?: string | null;
  parentDocumentId?: string | null;
  authType?: AuthenticationType | null;
  ip?: string;
};

export type DocumentImportTaskResponse =
  | {
      documentId: string;
    }
  | {
      error: string;
    };

export default class DocumentImportTask extends BaseTask<Props> {
  /**
   * Imports a document on a worker, keeping conversion off the process that
   * received the request, and blocks until the worker has finished.
   *
   * @param props the content to import and attributes for the created document.
   * @returns the created document.
   * @throws InvalidRequestError if the content could not be converted.
   */
  public static async scheduleAndWait(props: Props): Promise<Document> {
    const job = await new DocumentImportTask().schedule(props);
    const response: DocumentImportTaskResponse = await job.finished();

    if ("error" in response) {
      throw InvalidRequestError(response.error);
    }

    return Document.findByPk(response.documentId, {
      userId: props.userId,
      rejectOnEmpty: true,
    });
  }

  public async perform({
    key,
    content,
    sourceMetadata,
    attributes,
    authType,
    ip,
    publish,
    collectionId,
    parentDocumentId,
    userId,
  }: Props): Promise<DocumentImportTaskResponse> {
    try {
      let body: Buffer | string;
      if (key) {
        body = await FileStorage.getFileBuffer(key);
      } else if (content !== undefined) {
        // Empty content is valid and imports an empty document, so only a
        // missing one is rejected.
        body = content;
      } else {
        throw InvalidRequestError("one of key or content is required");
      }

      const user = await User.findByPk(userId, {
        rejectOnEmpty: true,
      });

      // Run document conversion and image downloading outside a transaction
      const ctx = createContext({ user, authType, ip });

      const { text, state, title, icon } = await documentImporter({
        user,
        fileName: sourceMetadata.fileName,
        mimeType: sourceMetadata.mimeType,
        content: body,
        ctx,
      });

      const document = await sequelize.transaction(async (transaction) =>
        documentCreator(
          createContext({
            user,
            authType,
            ip,
            transaction,
          }),
          {
            sourceMetadata,
            title: attributes?.title ?? title,
            icon: attributes?.icon ?? icon,
            color: attributes?.color,
            fullWidth: attributes?.fullWidth,
            text,
            state,
            publish,
            collectionId,
            parentDocumentId,
          }
        )
      );
      return { documentId: document.id };
    } catch (err) {
      return { error: errToString(err) };
    } finally {
      if (key) {
        await FileStorage.deleteFile(key);
      }
    }
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Normal,
    };
  }
}
