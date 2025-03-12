import chunk from "lodash/chunk";
import uniqBy from "lodash/uniqBy";
import { Fragment, Node } from "prosemirror-model";
import { Transaction } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import {
  AttachmentPreset,
  ImportState,
  ImportTaskInput,
  ImportTaskOutput,
  ImportTaskState,
  ProsemirrorData,
  ProsemirrorDoc,
} from "@shared/types";
import { ProsemirrorHelper as SharedProseMirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { createContext } from "@server/context";
import { schema } from "@server/editor";
import Logger from "@server/logging/Logger";
import { Attachment, Import, Integration, User } from "@server/models";
import ImportTask from "@server/models/ImportTask";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import BaseTask from "@server/queues/tasks/BaseTask";
import UploadAttachmentsForImportTask from "@server/queues/tasks/UploadAttachmentsForImportTask";
import { sequelize } from "@server/storage/database";
import { NotionConverter, NotionPage } from "@server/utils/NotionConverter";
import { NotionClient } from "../notion";
import { PagePerTask } from "../utils";
import { Block } from "plugins/notion/shared/types";

type ParsePageOutput = ImportTaskOutput[number] & {
  collectionExternalId?: string;
  childExternalIds: string[];
};

type Props = {
  /** id of the import_task */
  importTaskId: string;
};

export default class ImportNotionTaskV2 extends BaseTask<Props> {
  public async perform({ importTaskId }: Props) {
    const importTask = await ImportTask.findByPk(importTaskId, {
      rejectOnEmpty: true,
      include: [
        {
          model: Import.scope("withUser"),
          as: "import",
          required: true,
        },
      ],
    });

    switch (importTask.state) {
      case ImportTaskState.Created: {
        await importTask.update({ state: ImportTaskState.InProgress });
        return this.process(importTask);
      }

      case ImportTaskState.InProgress:
        return this.process(importTask);

      case ImportTaskState.Completed:
        return await this.completionFlow(importTask);
    }
  }

  private async process(importTask: ImportTask) {
    const integration = await Integration.scope("withAuthentication").findByPk(
      importTask.import.integrationId,
      { rejectOnEmpty: true }
    );

    const client = new NotionClient(integration.authentication.token);

    const parsedPages = await Promise.all(
      importTask.input.map(async (page) =>
        this.parsePage({ page, client, createdBy: importTask.import.createdBy })
      )
    );

    const taskOutput: ImportTaskOutput = parsedPages.map<
      ImportTaskOutput[number]
    >((parsedPage) => ({
      externalId: parsedPage.externalId,
      title: parsedPage.title,
      emoji: parsedPage.emoji,
      content: parsedPage.content,
    }));

    const childTasksInput: ImportTaskInput = parsedPages.flatMap((parsedPage) =>
      parsedPage.childExternalIds.map<ImportTaskInput[number]>(
        (childExternalId) => ({
          externalId: childExternalId,
          parentExternalId: parsedPage.externalId,
          collectionExternalId: parsedPage.collectionExternalId,
        })
      )
    );

    await sequelize.transaction(async (transaction) => {
      await Promise.all(
        chunk(childTasksInput, PagePerTask).map(async (input) => {
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

      importTask.output = taskOutput;
      importTask.state = ImportTaskState.Completed;
      await importTask.save({ transaction });
    });

    await ImportNotionTaskV2.schedule({ importTaskId: importTask.id });
  }

  private async completionFlow(importTask: ImportTask) {
    const nextImportTask = await ImportTask.findOne({
      where: {
        state: ImportTaskState.Created,
        importId: importTask.importId,
      },
    });

    if (nextImportTask) {
      await ImportNotionTaskV2.schedule({ importTaskId: nextImportTask.id });
      return;
    }

    await sequelize.transaction(async (transaction) => {
      const associatedImport = await Import.scope("withUser").findByPk(
        importTask.importId,
        {
          rejectOnEmpty: true,
          transaction,
          lock: Transaction.LOCK.UPDATE,
        }
      );

      const ctx = createContext({
        user: associatedImport.createdBy,
        transaction,
      });

      associatedImport.state = ImportState.Processed;
      await associatedImport.saveWithCtx(ctx, undefined, { name: "processed" });
    });
  }

  private async parsePage({
    page,
    client,
    createdBy,
  }: {
    page: ImportTaskInput[number];
    client: NotionClient;
    createdBy: User;
  }): Promise<ParsePageOutput> {
    const { title, emoji, blocks } = await client.fetchPage(page.externalId);

    const doc = NotionConverter.page({ children: blocks } as NotionPage);

    const docWithReplacements = await this.uploadAttachments({
      doc,
      externalId: page.externalId,
      createdBy,
    });

    return {
      externalId: page.externalId,
      title,
      emoji,
      content: docWithReplacements,
      collectionExternalId: page.collectionExternalId ?? page.externalId,
      childExternalIds: this.getChildPageIds(blocks),
    };
  }

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

  private getChildPageIds(pageBlocks: Block[]) {
    const childPageIds: string[] = [];

    pageBlocks.forEach((block) => {
      if (block.type === "child_page") {
        childPageIds.push(block.id);
      } else if (block.children?.length) {
        childPageIds.push(...this.getChildPageIds(block.children));
      }
    });

    return childPageIds;
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
}
