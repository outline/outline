import { subHours } from "date-fns";
import { ImportState, ImportTaskPhase, ImportTaskState } from "@shared/types";
import type { IntegrationService } from "@shared/types";
import { Import, ImportTask } from "@server/models";
import { buildImport } from "@server/test/factories";
import ErrorTimedOutImportsTask from "./ErrorTimedOutImportsTask";

const props = {
  limit: 100,
  partition: {
    partitionIndex: 0,
    partitionCount: 1,
  },
};

async function buildImportTask(
  importId: string,
  state: ImportTaskState,
  createdAt: Date
) {
  return ImportTask.create<ImportTask<IntegrationService.Notion>>({
    state,
    phase: ImportTaskPhase.Bootstrap,
    input: [],
    output: [],
    importId,
    createdAt,
  } as Parameters<typeof ImportTask.create>[0]);
}

describe("ErrorTimedOutImportsTask", () => {
  it("should error import tasks older than 24 hours", async () => {
    const importModel = await buildImport({
      state: ImportState.InProgress,
    });
    const oldTask = await buildImportTask(
      importModel.id,
      ImportTaskState.InProgress,
      subHours(new Date(), 25)
    );
    const recentTask = await buildImportTask(
      importModel.id,
      ImportTaskState.InProgress,
      subHours(new Date(), 1)
    );

    const task = new ErrorTimedOutImportsTask();
    await task.perform(props);

    await oldTask.reload();
    expect(oldTask.state).toEqual(ImportTaskState.Errored);
    expect(oldTask.error).toEqual("Timed out");
    expect(oldTask.input).toEqual([]);

    await recentTask.reload();
    expect(recentTask.state).toEqual(ImportTaskState.InProgress);

    await importModel.reload();
    expect(importModel.state).toEqual(ImportState.Errored);
    expect(importModel.error).toEqual("Timed out");
    expect(importModel.name).toEqual("testImport");
  });

  it("should not error import tasks of a canceled import", async () => {
    const importModel = await buildImport({
      state: ImportState.Canceled,
    });
    const oldTask = await buildImportTask(
      importModel.id,
      ImportTaskState.Created,
      subHours(new Date(), 25)
    );

    const task = new ErrorTimedOutImportsTask();
    await task.perform(props);

    await oldTask.reload();
    expect(oldTask.state).toEqual(ImportTaskState.Created);

    const reloaded = await Import.findByPk(importModel.id);
    expect(reloaded?.state).toEqual(ImportState.Canceled);
  });
});
