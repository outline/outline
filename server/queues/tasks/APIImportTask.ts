import { JobOptions } from "bull";
import chunk from "lodash/chunk";
import truncate from "lodash/truncate";
import uniqBy from "lodash/uniqBy";
import { Fragment, Node } from "prosemirror-model";
import { Transaction, WhereOptions } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import { ImportTaskInput, ImportTaskOutput } from "@shared/schema";
import {
  AttachmentPreset,
  ImportableIntegrationService,
  ImportState,
  ImportTaskState,
  ProsemirrorData,
  ProsemirrorDoc,
} from "@shared/types";
import { ProsemirrorHelper as SharedProseMirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { createContext } from "@server/context";
import { schema } from "@server/editor";
import Logger from "@server/logging/Logger";
import { Attachment, Import, ImportTask, User } from "@server/models";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { sequelize } from "@server/storage/database";
import { PagePerImportTask } from "../processors/ImportsProcessor";
import BaseTask, { TaskPriority } from "./BaseTask";
import UploadAttachmentsForImportTask from "./UploadAttachmentsForImportTask";

export type ProcessOutput<T extends ImportableIntegrationService> = {
  taskOutput: ImportTaskOutput;
  childTasksInput: ImportTaskInput<T>;
};

type Props = {
  /** id of the import_task */
  importTaskId: string;
};

export default abstract class APIImportTask<
  T extends ImportableIntegrationService
> extends BaseTask<Props> {
  /**
   * Run the import task.
   *
   * @param importTaskId id of the import_task model.
   * @returns Promise that resolves once the task has completed.
   */
  public async perform({ importTaskId }: Props) {
    let importTask = await ImportTask.findByPk<ImportTask<T>>(importTaskId, {
      rejectOnEmpty: true,
      include: [
        {
          model: Import,
          as: "import",
          required: true,
        },
      ],
    });

    // Don't process any further when the associated import is canceled by the user.
    if (importTask.import.state === ImportState.Canceled) {
      importTask.state = ImportTaskState.Canceled;
      await importTask.save();
      return;
    }

    try {
      switch (importTask.state) {
        case ImportTaskState.Created: {
          importTask.state = ImportTaskState.InProgress;
          importTask = await importTask.save();
          return await this.onProcess(importTask);
        }

        case ImportTaskState.InProgress:
          return await this.onProcess(importTask);

        case ImportTaskState.Completed:
          return await this.onCompletion(importTask);

        default:
      }
    } catch (err) {
      if (err instanceof Error) {
        importTask.error = truncate(err.message, { length: 255 });
        await importTask.save();
      }

      throw err; // throw error for retry.
    }
  }

  /**
   * Handle failure when all attempts of APIImportTask has failed.
   *
   * @param importTaskId id of the import_task model.
   * @returns Promise that resolves once failure has been handled.
   */
  public async onFailed({ importTaskId }: Props) {
    await sequelize.transaction(async (transaction) => {
      const importTask = await ImportTask.findByPk<ImportTask<T>>(
        importTaskId,
        {
          rejectOnEmpty: true,
          include: [
            {
              model: Import,
              as: "import",
              required: true,
            },
          ],
          transaction,
          lock: Transaction.LOCK.UPDATE,
        }
      );

      importTask.state = ImportTaskState.Errored;
      await importTask.save({ transaction });

      const associatedImport = importTask.import;
      associatedImport.error = importTask.error; // copy error from ImportTask that caused the failure.
      associatedImport.state = ImportState.Errored;
      await associatedImport.saveWithCtx(
        createContext({
          user: associatedImport.createdBy,
          transaction,
        })
      );
    });
  }

  /**
   * Creation flow for the task.
   * This fetches data from external source, stores the task output and creates subsequent import_task models.
   *
   * @param importTask import_task model to process.
   * @returns Promise that resolves once processing has completed.
   */
  private async onProcess(importTask: ImportTask<T>) {
    const { taskOutput, childTasksInput } = await this.process(importTask);

    const taskOutputWithReplacements = await Promise.all(
      taskOutput.map(async (item) => ({
        ...item,
        content: await this.uploadAttachments({
          doc: item.content,
          externalId: item.externalId,
          createdBy: importTask.import.createdBy,
        }),
      }))
    );

    await sequelize.transaction(async (transaction) => {
      await Promise.all(
        chunk(childTasksInput, PagePerImportTask).map(async (input) => {
          await ImportTask.create(
            {
              state: ImportTaskState.Created,
              input,
              importId: importTask.importId,
            },
            { transaction }
          );
        })
      );

      importTask.output = taskOutputWithReplacements;
      importTask.state = ImportTaskState.Completed;
      importTask.error = null; // unset any error from previous attempts.
      await importTask.save({ transaction });

      const associatedImport = importTask.import;
      associatedImport.documentCount += taskOutputWithReplacements.length;
      await associatedImport.saveWithCtx(
        createContext({
          user: associatedImport.createdBy,
          transaction,
        })
      );
    });

    await this.scheduleNextTask(importTask);
  }

  /**
   * Completion flow for the task.
   * This determines if there are any more import_tasks to process (or) all tasks for the import have been processed, and schedules the next step.
   *
   * @param importTask import_task model to process.
   * @returns Promise that resolves once processing has completed.
   */
  private async onCompletion(importTask: ImportTask<T>) {
    const where: WhereOptions<ImportTask<T>> = {
      state: ImportTaskState.Created,
      importId: importTask.importId,
    };

    const nextImportTask = await ImportTask.findOne<ImportTask<T>>({
      where,
      order: [["createdAt", "ASC"]],
    });

    // Tasks available to process for this import.
    if (nextImportTask) {
      return await this.scheduleNextTask(nextImportTask);
    }

    // All tasks for this import have been processed.
    await sequelize.transaction(async (transaction) => {
      const associatedImport = importTask.import;
      associatedImport.state = ImportState.Processed;
      await associatedImport.saveWithCtx(
        createContext({
          user: associatedImport.createdBy,
          transaction,
        }),
        undefined,
        { name: "processed" }
      );
    });
  }

  /**
   * Process the import task.
   * This fetches data from external source and converts it to task output.
   *
   * @param importTask ImportTask model to process.
   * @returns Promise with output that resolves once processing has completed.
   */
  protected abstract process(
    importTask: ImportTask<T>
  ): Promise<ProcessOutput<T>>;

  /**
   * Schedule the next `APIImportTask`.
   *
   * @param importTask ImportTask model associated with the `APIImportTask`.
   * @returns Promise that resolves when the task is scheduled.
   */
  protected abstract scheduleNextTask(importTask: ImportTask<T>): Promise<void>;

  /**
   * Upload attachments found in the external document.
   *
   * @param doc ProseMirrorDoc that represents collection (or) document content.
   * @param externalId id of the document in the external service.
   * @param createdBy user who created the import.
   * @returns Updated ProseMirrorDoc.
   */
  private async uploadAttachments({
    doc,
    externalId,
    createdBy,
  }: {
    doc: ProsemirrorDoc;
    externalId: string;
    createdBy: User;
  }): Promise<ProsemirrorDoc> {
    const docNode = ProsemirrorHelper.toProsemirror(doc);
    const nodes = [
      ...SharedProseMirrorHelper.getImages(docNode),
      ...SharedProseMirrorHelper.getVideos(docNode),
      ...SharedProseMirrorHelper.getAttachments(docNode),
    ];

    if (!nodes.length) {
      return doc;
    }

    const urlToAttachment: Record<string, Attachment> = {};

    // perf: dedup url.
    const attachmentsData = uniqBy(
      nodes.map((node) => {
        const url = String(
          node.type.name === "attachment" ? node.attrs.href : node.attrs.src
        );
        const name = String(
          node.type.name === "image" ? node.attrs.alt : node.attrs.title
        ).trim();

        return { url, name: name.length !== 0 ? name : node.type.name };
      }),
      "url"
    );

    await sequelize.transaction(async (transaction) => {
      const dbPromises = attachmentsData.map(async (item) => {
        const modelId = uuidv4();
        const acl = AttachmentHelper.presetToAcl(
          AttachmentPreset.DocumentAttachment
        );
        const key = AttachmentHelper.getKey({
          acl,
          id: modelId,
          name: item.name,
          userId: createdBy.id,
        });

        const attachment = await Attachment.create(
          {
            id: modelId,
            key,
            acl,
            size: 0,
            expiresAt: AttachmentHelper.presetToExpiry(
              AttachmentPreset.DocumentAttachment
            ),
            contentType: "application/octet-stream",
            documentId: externalId,
            teamId: createdBy.teamId,
            userId: createdBy.id,
          },
          { transaction }
        );

        urlToAttachment[item.url] = attachment;
      });

      return await Promise.all(dbPromises);
    });

    try {
      const uploadItems = Object.entries(urlToAttachment).map(
        ([url, attachment]) => ({ attachmentId: attachment.id, url })
      );
      // publish task after attachments are persisted in DB.
      const job = await new UploadAttachmentsForImportTask().schedule(
        uploadItems
      );
      await job.finished();
    } catch (err) {
      // upload attachments failure is not critical enough to fail the whole import.
      Logger.error(
        `upload attachment task failed for externalId ${externalId}`,
        err
      );
    }

    return this.replaceAttachmentUrls(docNode, urlToAttachment).toJSON();
  }

  /**
   * Replace remote url to internal redirect url for attachments.
   *
   * @param doc ProseMirror node that represents collection (or) document content.
   * @param urlToAttachment Map of remote url to attachment model.
   * @returns Updated Prosemirror node.
   */
  private replaceAttachmentUrls(
    doc: Node,
    urlToAttachment: Record<string, Attachment>
  ): Node {
    const attachmentTypes = ["attachment", "image", "video"];

    const transformAttachmentNode = (node: Node): Node => {
      const json = node.toJSON() as ProsemirrorData;
      const attrs = json.attrs ?? {};

      if (node.type.name === "attachment") {
        const attachmentModel = urlToAttachment[attrs.href as string];
        // attachment node uses 'href' attribute.
        attrs.href = attachmentModel.redirectUrl;
        // attachment node can have id.
        attrs.id = attachmentModel.id;
      } else if (node.type.name === "image" || node.type.name === "video") {
        // image & video nodes use 'src' attribute.
        attrs.src = urlToAttachment[attrs.src as string].redirectUrl;
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

    return doc.copy(transformFragment(doc.content));
  }

  /**
   * Job options such as priority and retry strategy, as defined by Bull.
   */
  public get options(): JobOptions {
    return {
      priority: TaskPriority.Normal,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 60 * 1000,
      },
    };
  }
}
