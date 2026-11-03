import { randomUUID } from "node:crypto";
import { ImportState, ImportTaskPhase, ImportTaskState } from "@shared/types";
import { ImportTask } from "@server/models";
import { buildImport } from "@server/test/factories";
import { mockTaskSchedule } from "@server/test/support";
import { NotionClient } from "../notion";
import type { Block } from "../../shared/types";
import { PageType } from "../../shared/types";
import NotionAPIImportTask from "./NotionAPIImportTask";

const childPage = (id: string) =>
  ({
    object: "block",
    id,
    type: "child_page",
    has_children: false,
    child_page: { title: id },
  }) as unknown as Block;

const mockFetchPage = (blocks: Block[]) =>
  vi.spyOn(NotionClient.prototype, "fetchPage").mockResolvedValue({
    title: "Page",
    blocks,
  });

describe("NotionAPIImportTask", () => {
  const schedule = mockTaskSchedule();

  const buildImportTask = async (
    importId: string,
    item: { externalId: string; ancestorExternalIds?: string[] }
  ) =>
    ImportTask.create({
      state: ImportTaskState.InProgress,
      phase: ImportTaskPhase.Page,
      input: [{ type: PageType.Page, ...item }],
      importId,
    });

  const createdTasks = (importId: string) =>
    ImportTask.findAll({
      where: { importId, state: ImportTaskState.Created },
    });

  it("should not queue a page that lists itself as a child", async () => {
    const importModel = await buildImport();
    const pageId = randomUUID();
    const childId = randomUUID();
    const importTask = await buildImportTask(importModel.id, {
      externalId: pageId,
    });
    mockFetchPage([childPage(pageId), childPage(childId)]);

    await new NotionAPIImportTask().perform({ importTaskId: importTask.id });

    const tasks = await createdTasks(importModel.id);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].input).toEqual([
      expect.objectContaining({
        externalId: childId,
        parentExternalId: pageId,
        ancestorExternalIds: [pageId],
      }),
    ]);
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  it("should not queue an ancestor or a repeated child", async () => {
    const importModel = await buildImport();
    const rootId = randomUUID();
    const pageId = randomUUID();
    const childId = randomUUID();
    const importTask = await buildImportTask(importModel.id, {
      externalId: pageId,
      ancestorExternalIds: [rootId],
    });
    mockFetchPage([childPage(rootId), childPage(childId), childPage(childId)]);

    await new NotionAPIImportTask().perform({ importTaskId: importTask.id });

    const tasks = await createdTasks(importModel.id);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].input).toEqual([
      expect.objectContaining({
        externalId: childId,
        ancestorExternalIds: [rootId, pageId],
      }),
    ]);
  });

  it("should stop when the import has already finished", async () => {
    const importModel = await buildImport({ state: ImportState.Completed });
    const importTask = await buildImportTask(importModel.id, {
      externalId: randomUUID(),
    });
    const fetchPage = mockFetchPage([childPage(randomUUID())]);

    await new NotionAPIImportTask().perform({ importTaskId: importTask.id });

    await importTask.reload();
    expect(importTask.state).toEqual(ImportTaskState.Canceled);
    expect(fetchPage).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });
});
