import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImportTaskOutput } from "@shared/schema";
import type { ProsemirrorDoc } from "@shared/types";
import {
  ImportState,
  ImportTaskPhase,
  ImportTaskState,
  IntegrationService,
} from "@shared/types";
import { Attachment, Import, ImportTask, User } from "@server/models";
import { sequelize } from "@server/storage/database";
import APIImportTask, { type ProcessOutput } from "./APIImportTask";
import UploadAttachmentsForImportTask from "./UploadAttachmentsForImportTask";

class TestAPIImportTask extends APIImportTask<IntegrationService.JSON> {
  private readonly output: ImportTaskOutput;

  public constructor(output: ImportTaskOutput) {
    super();
    this.output = output;
  }

  protected async processPage(): Promise<
    ProcessOutput<IntegrationService.JSON>
  > {
    return {
      taskOutput: this.output,
      childTasksInput: [],
    };
  }

  protected async scheduleNextTask(): Promise<void> {
    return;
  }
}

const buildDocWithUnnamedAttachments = (): ProsemirrorDoc => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "image",
          attrs: {
            src: "https://example.com/image.png",
            alt: null,
          },
        },
      ],
    },
    {
      type: "video",
      attrs: {
        src: "https://example.com/video.mp4",
        title: null,
      },
    },
    {
      type: "attachment",
      attrs: {
        href: "https://example.com/file.pdf",
        title: "   ",
      },
    },
  ],
});

describe("APIImportTask", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the node type when imported attachment names are missing", async () => {
    const userId = "00000000-0000-0000-0000-000000000001";
    const teamId = "00000000-0000-0000-0000-000000000002";
    const externalId = "00000000-0000-0000-0000-000000000003";
    const createdBy = User.build({
      id: userId,
      teamId,
      lastActiveIp: null,
    });
    const importModel = Import.build<Import<IntegrationService.JSON>>({
      id: "00000000-0000-0000-0000-000000000004",
      name: "testImport",
      service: IntegrationService.JSON,
      state: ImportState.Created,
      input: [{ externalId }],
      scratch: null,
      documentCount: 0,
      error: null,
      integrationId: null,
      createdById: userId,
      teamId,
    });
    importModel.createdBy = createdBy;
    vi.spyOn(importModel, "saveWithCtx").mockResolvedValue(importModel);

    const importTask = ImportTask.build<ImportTask<IntegrationService.JSON>>({
      id: "00000000-0000-0000-0000-000000000005",
      state: ImportTaskState.Created,
      phase: ImportTaskPhase.Page,
      input: [{ externalId }],
      importId: importModel.id,
    });
    importTask.import = importModel;
    vi.spyOn(importTask, "save").mockResolvedValue(importTask);

    vi.spyOn(ImportTask, "findByPk").mockResolvedValue(importTask);
    vi.spyOn(sequelize, "transaction").mockImplementation((async (
      callback: (transaction: never) => Promise<unknown>
    ) => callback(undefined as never)) as never);
    const createAttachment = vi
      .spyOn(Attachment, "create")
      .mockImplementation(async (values) => Attachment.build(values ?? {}));
    vi.spyOn(
      UploadAttachmentsForImportTask.prototype,
      "schedule"
    ).mockResolvedValue(undefined as never);

    const task = new TestAPIImportTask([
      {
        externalId,
        title: "Imported page",
        content: buildDocWithUnnamedAttachments(),
      },
    ]);

    await task.perform({ importTaskId: importTask.id });

    const attachmentNames = createAttachment.mock.calls.map(([values]) =>
      String(values?.key).split("/").at(-1)
    );

    expect(attachmentNames).toEqual(["image", "video", "attachment"]);
  });
});
