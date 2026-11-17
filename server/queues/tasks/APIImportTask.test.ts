import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  ImportState,
  ImportTaskPhase,
  ImportTaskState,
  IntegrationService,
} from "@shared/types";
import { Import, ImportTask } from "@server/models";
import { buildImport } from "@server/test/factories";
import type { ProcessOutput } from "./APIImportTask";
import APIImportTask from "./APIImportTask";

type Service = IntegrationService.JSON;

class TestImportTask extends APIImportTask<Service> {
  public onAllTasksCompletedCallback?: () => Promise<void>;

  protected processPage(): Promise<ProcessOutput<Service>> {
    return Promise.resolve({ taskOutput: [], childTasksInput: [] });
  }

  protected scheduleNextTask(): Promise<void> {
    return Promise.resolve();
  }

  protected async onAllTasksCompleted(): Promise<void> {
    await this.onAllTasksCompletedCallback?.();
  }
}

async function buildImportTask(
  importState: ImportState,
  taskState: ImportTaskState
) {
  const importModel = await buildImport({
    service: IntegrationService.JSON,
    state: importState,
  });
  const importTask = await ImportTask.create<ImportTask<Service>>({
    state: taskState,
    phase: ImportTaskPhase.Page,
    input: [{ externalId: randomUUID() }],
    importId: importModel.id,
  });
  return { importModel, importTask };
}

describe("APIImportTask", () => {
  describe("onCompletion", () => {
    it("marks the import as processed", async () => {
      const { importModel, importTask } = await buildImportTask(
        ImportState.InProgress,
        ImportTaskState.Completed
      );

      await new TestImportTask().perform({ importTaskId: importTask.id });

      await importModel.reload();
      expect(importModel.state).toBe(ImportState.Processed);
    });

    it("does not overwrite a cancel that commits while the task runs", async () => {
      const { importModel, importTask } = await buildImportTask(
        ImportState.InProgress,
        ImportTaskState.Completed
      );

      const task = new TestImportTask();
      task.onAllTasksCompletedCallback = async () => {
        await Import.update(
          { state: ImportState.Canceled },
          { where: { id: importModel.id } }
        );
      };
      await task.perform({ importTaskId: importTask.id });

      await importModel.reload();
      expect(importModel.state).toBe(ImportState.Canceled);
    });
  });

  describe("onFailed", () => {
    it("marks the task and import as errored", async () => {
      const { importModel, importTask } = await buildImportTask(
        ImportState.InProgress,
        ImportTaskState.InProgress
      );
      await importTask.update({ error: "Boom" });

      await new TestImportTask().onFailed({ importTaskId: importTask.id });

      await importModel.reload();
      await importTask.reload();
      expect(importTask.state).toBe(ImportTaskState.Errored);
      expect(importModel.state).toBe(ImportState.Errored);
      expect(importModel.error).toBe("Boom");
    });

    it("does not change a canceled import", async () => {
      const { importModel, importTask } = await buildImportTask(
        ImportState.Canceled,
        ImportTaskState.InProgress
      );

      await new TestImportTask().onFailed({ importTaskId: importTask.id });

      await importModel.reload();
      await importTask.reload();
      expect(importModel.state).toBe(ImportState.Canceled);
      expect(importTask.state).toBe(ImportTaskState.InProgress);
    });

    it("does not change a completed task", async () => {
      const { importModel, importTask } = await buildImportTask(
        ImportState.InProgress,
        ImportTaskState.Completed
      );

      await new TestImportTask().onFailed({ importTaskId: importTask.id });

      await importModel.reload();
      await importTask.reload();
      expect(importTask.state).toBe(ImportTaskState.Completed);
      expect(importModel.state).toBe(ImportState.Errored);
    });
  });
});
