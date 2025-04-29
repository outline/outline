import { Transaction } from "sequelize";
import { NotionImportInput, NotionImportTaskInput } from "@shared/schema";
import { IntegrationService } from "@shared/types";
import { Import, ImportTask, Integration } from "@server/models";
import ImportsProcessor from "@server/queues/processors/ImportsProcessor";
import { NotionClient } from "../notion";
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
  protected async buildTasksInput(
    importModel: Import<IntegrationService.Notion>,
    transaction: Transaction
  ): Promise<NotionImportTaskInput> {
    const integration = await Integration.scope("withAuthentication").findByPk(
      importModel.integrationId,
      { rejectOnEmpty: true }
    );

    const notion = new NotionClient(integration.authentication.token);

    const rootPages = await notion.fetchRootPages();

    // App will send the default permission in an array with single item.
    const defaultPermission = importModel.input[0].permission;

    // TODO: This update can be deleted when we receive the page info + permission from app.
    const importInput: NotionImportInput = rootPages.map((page) => ({
      type: page.type,
      externalId: page.id,
      permission: defaultPermission,
    }));

    importModel.input = importInput;
    await importModel.save({ transaction });

    return rootPages.map((page) => ({
      type: page.type,
      externalId: page.id,
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
    await new NotionAPIImportTask().schedule({ importTaskId: importTask.id });
  }
}
