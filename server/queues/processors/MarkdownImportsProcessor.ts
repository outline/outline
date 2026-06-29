import type { Transaction } from "sequelize";
import type { ImportTaskInput } from "@shared/schema";
import { ImportTaskPhase, IntegrationService } from "@shared/types";
import type { Import, ImportTask } from "@server/models";
import MarkdownAPIImportTask from "../tasks/MarkdownAPIImportTask";
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
    await new MarkdownAPIImportTask().schedule({ importTaskId: importTask.id });
  }
}
