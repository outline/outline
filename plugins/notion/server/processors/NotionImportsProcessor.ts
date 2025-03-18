import { NotionImportInput, NotionImportTaskInput } from "@shared/schema";
import { IntegrationService } from "@shared/types";
import { Import, ImportTask } from "@server/models";
import ImportsProcessor from "@server/queues/processors/ImportsProcessor";
import NotionAPIImportTask from "../tasks/NotionAPIImportTask";

export class NotionImportsProcessor extends ImportsProcessor<IntegrationService.Notion> {
  /**
   * Determine whether this is a "Notion" import.
   *
   * @param importModel Import model associated with the import.
   * @returns boolean.
   */
  protected canProcess(
    importModel: Import<IntegrationService.Notion>
  ): boolean {
    return importModel.service === IntegrationService.Notion;
  }

  /**
   * Build task inputs which will be used for `NotionAPIImportTask`s.
   *
   * @param importInput Array of root externalId and associated info which were used to create the import.
   * @returns `NotionImportTaskInput`.
   */
  protected buildTasksInput(
    importInput: NotionImportInput
  ): NotionImportTaskInput {
    return importInput.map((item) => ({
      type: item.type,
      externalId: item.externalId,
    }));
  }

  /**
   * Schedule the first `NotionAPIImportTask` for the import.
   *
   * @param importTask ImportTask model associated with the `NotionAPIImportTask`.
   * @returns Promise that resolves when the task is scheduled.
   */
  protected async scheduleTask(
    importTask: ImportTask<IntegrationService.Notion>
  ): Promise<void> {
    await NotionAPIImportTask.schedule({ importTaskId: importTask.id });
  }
}
