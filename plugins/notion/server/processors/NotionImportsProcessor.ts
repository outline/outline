import { NotionImportInput, NotionImportTaskInput } from "@shared/schema";
import { IntegrationService } from "@shared/types";
import { Import, ImportTask } from "@server/models";
import ImportsProcessor from "@server/queues/processors/ImportsProcessor";
import NotionAPIImportTask from "../tasks/NotionAPIImportTask";

export class NotionImportsProcessor extends ImportsProcessor<IntegrationService.Notion> {
  protected canProcess(
    importModel: Import<IntegrationService.Notion>
  ): boolean {
    return importModel.service === IntegrationService.Notion;
  }

  protected buildTasksInput(
    importInput: NotionImportInput
  ): NotionImportTaskInput {
    return importInput.map((item) => ({
      type: item.type,
      externalId: item.externalId,
    }));
  }

  protected async scheduleTask(
    importTask: ImportTask<IntegrationService.Notion>
  ): Promise<void> {
    await NotionAPIImportTask.schedule({ importTaskId: importTask.id });
  }
}
