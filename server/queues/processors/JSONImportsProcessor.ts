import type { Transaction } from "sequelize";
import type { ImportTaskInput } from "@shared/schema";
import { ImportTaskPhase, IntegrationService } from "@shared/types";
import type { Import, ImportTask } from "@server/models";
import JSONAPIImportTask from "../tasks/JSONAPIImportTask";
import ImportsProcessor from "./ImportsProcessor";

export default class JSONImportsProcessor extends ImportsProcessor<IntegrationService.JSON> {
  protected canProcess(importModel: Import<IntegrationService.JSON>): boolean {
    return importModel.service === IntegrationService.JSON;
  }

  protected getInitialPhase(): ImportTaskPhase {
    return ImportTaskPhase.Bootstrap;
  }

  protected async buildTasksInput(
    importModel: Import<IntegrationService.JSON>,
    _transaction: Transaction
  ): Promise<ImportTaskInput<IntegrationService.JSON>> {
    if (!importModel.scratch?.storageKey) {
      throw new Error(
        "JSON import is missing scratch.storageKey for the bootstrap phase"
      );
    }

    return [{ externalId: importModel.input[0].externalId }];
  }

  protected async scheduleTask(
    importTask: ImportTask<IntegrationService.JSON>
  ): Promise<void> {
    await new JSONAPIImportTask().schedule({ importTaskId: importTask.id });
  }
}
