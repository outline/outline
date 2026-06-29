import type { Transaction } from "sequelize";
import type { ImportTaskInput } from "@shared/schema";
import { ImportTaskPhase, IntegrationService } from "@shared/types";
import { Import } from "@server/models";
import type { ImportTask } from "@server/models";
import MarkdownAPIImportTask from "../tasks/MarkdownAPIImportTask";
import SlabAPIImportTask from "../tasks/SlabAPIImportTask";
import ImportsProcessor from "./ImportsProcessor";

type Markdown = IntegrationService.Markdown | IntegrationService.Slab;

export default class MarkdownImportsProcessor extends ImportsProcessor<Markdown> {
  protected canProcess(importModel: Import<Markdown>): boolean {
    return (
      importModel.service === IntegrationService.Markdown ||
      importModel.service === IntegrationService.Slab
    );
  }

  protected getInitialPhase(): ImportTaskPhase {
    return ImportTaskPhase.Bootstrap;
  }

  protected async buildTasksInput(
    importModel: Import<Markdown>,
    _transaction: Transaction
  ): Promise<ImportTaskInput<Markdown>> {
    if (!importModel.scratch?.storageKey) {
      throw new Error(
        "Markdown import is missing scratch.storageKey for the bootstrap phase"
      );
    }

    return [{ externalId: importModel.input[0].externalId }];
  }

  protected async scheduleTask(
    importTask: ImportTask<Markdown>
  ): Promise<void> {
    // `importTask.import` isn't loaded here (the row was just created), so read
    // the service directly to pick the matching task implementation. Slab
    // reuses the Markdown pipeline through a dedicated subclass; subsequent
    // task waves keep that class via the task's own `scheduleNextTask`.
    const { service } = await Import.findByPk(importTask.importId, {
      attributes: ["id", "service"],
      rejectOnEmpty: true,
    });

    const TaskClass =
      service === IntegrationService.Slab
        ? SlabAPIImportTask
        : MarkdownAPIImportTask;

    await new TaskClass().schedule({ importTaskId: importTask.id });
  }
}
