import { PagePerImportTask } from "@server/constants";
import { createContext } from "@server/context";
import { schema } from "@server/editor";
import Logger from "@server/logging/Logger";
import { Attachment, Import, ImportTask, User } from "@server/models";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { sequelize } from "@server/storage/database";
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
import { JobOptions } from "bull";
import chunk from "lodash/chunk";
import uniqBy from "lodash/uniqBy";
import { Fragment, Node } from "prosemirror-model";
import { Transaction, WhereOptions } from "sequelize";
import { v4 as uuidv4 } from "uuid";
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
  }

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
      associatedImport.state = ImportState.Errored;
      await associatedImport.saveWithCtx(
        createContext({
          user: associatedImport.createdBy,
          transaction,
        })
      );
    });
  }

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
      await importTask.save({ transaction });

      const associatedImport = importTask.import;
      associatedImport.pageCount += importTask.input.length;
      await associatedImport.saveWithCtx(
        createContext({
          user: associatedImport.createdBy,
          transaction,
        })
      );
    });

    await this.scheduleNextTask(importTask);
  }

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

  protected abstract process(
    importTask: ImportTask<T>
  ): Promise<ProcessOutput<T>>;

  protected abstract scheduleNextTask(importTask: ImportTask<T>): Promise<void>;

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
      const job = await UploadAttachmentsForImportTask.schedule(uploadItems);
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
