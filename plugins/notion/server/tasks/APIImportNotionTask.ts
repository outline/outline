import { schema } from "@server/editor";
import Logger from "@server/logging/Logger";
import { Attachment, Integration, User } from "@server/models";
import ImportTask from "@server/models/ImportTask";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import APIImportTask, {
  ProcessOutput,
} from "@server/queues/tasks/APIImportTask";
import UploadAttachmentsForImportTask from "@server/queues/tasks/UploadAttachmentsForImportTask";
import { sequelize } from "@server/storage/database";
import { NotionConverter, NotionPage } from "@server/utils/NotionConverter";
import { ImportTaskInput, ImportTaskOutput } from "@shared/schema";
import {
  AttachmentPreset,
  IntegrationService,
  ProsemirrorData,
  ProsemirrorDoc,
} from "@shared/types";
import { ProsemirrorHelper as SharedProseMirrorHelper } from "@shared/utils/ProsemirrorHelper";
import uniqBy from "lodash/uniqBy";
import { Block, PageType } from "plugins/notion/shared/types";
import { Fragment, Node } from "prosemirror-model";
import { v4 as uuidv4 } from "uuid";
import { NotionClient } from "../notion";

type ChildPage = { type: PageType; externalId: string };

type ParsePageOutput = ImportTaskOutput[number] & {
  collectionExternalId?: string;
  children: ChildPage[];
};

export default class APIImportNotionTask extends APIImportTask<IntegrationService.Notion> {
  protected async process(
    importTask: ImportTask<IntegrationService.Notion>
  ): Promise<ProcessOutput<IntegrationService.Notion>> {
    const integration = await Integration.scope("withAuthentication").findByPk(
      importTask.import.integrationId,
      { rejectOnEmpty: true }
    );

    const client = new NotionClient(integration.authentication.token);

    const parsedPages = await Promise.all(
      importTask.input.map(async (item) =>
        this.parseItem({ item, client, createdBy: importTask.import.createdBy })
      )
    );

    const taskOutput: ImportTaskOutput = parsedPages.map((parsedPage) => ({
      externalId: parsedPage.externalId,
      title: parsedPage.title,
      emoji: parsedPage.emoji,
      content: parsedPage.content,
    }));

    const childTasksInput: ImportTaskInput<IntegrationService.Notion> =
      parsedPages.flatMap((parsedPage) =>
        parsedPage.children.map((childPage) => ({
          type: childPage.type,
          externalId: childPage.externalId,
          parentExternalId: parsedPage.externalId,
          collectionExternalId: parsedPage.collectionExternalId,
        }))
      );

    return { taskOutput, childTasksInput };
  }

  protected async scheduleNextTask(
    importTask: ImportTask<IntegrationService.Notion>
  ) {
    await APIImportNotionTask.schedule({ importTaskId: importTask.id });
    return;
  }

  private async parseItem({
    item,
    client,
    createdBy,
  }: {
    item: ImportTaskInput<IntegrationService.Notion>[number];
    client: NotionClient;
    createdBy: User;
  }): Promise<ParsePageOutput> {
    const {
      title: pageTitle,
      emoji: pageEmoji,
      blocks,
    } = await client.fetchPage(item.externalId);

    const doc = NotionConverter.page({ children: blocks } as NotionPage);

    const docWithReplacements = await this.uploadAttachments({
      doc,
      externalId: item.externalId,
      createdBy,
    });

    return {
      externalId: item.externalId,
      title: pageTitle,
      emoji: pageEmoji,
      content: docWithReplacements,
      collectionExternalId: item.collectionExternalId ?? item.externalId,
      children: this.parseChildPages(blocks),
    };

    // const {
    //   title: databaseTitle,
    //   emoji: databaseEmoji,
    //   pages,
    // } = await client.fetchDatabase(item.externalId);
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

  private parseChildPages(pageBlocks: Block[]): ChildPage[] {
    const childPages: ChildPage[] = [];

    pageBlocks.forEach((block) => {
      if (block.type === "child_page") {
        childPages.push({ type: PageType.Page, externalId: block.id });
      } else if (block.children?.length) {
        childPages.push(...this.parseChildPages(block.children));
      }
    });

    return childPages;
  }
}
