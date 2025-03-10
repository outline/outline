import { Import } from "@server/models";
import ImportTask from "@server/models/ImportTask";
import { sequelize } from "@server/storage/database";
import { Event, ImportEvent } from "@server/types";
import { ImportState, ImportTaskInput, ImportTaskState } from "@shared/types";
import chunk from "lodash/chunk";
import ImportNotionTaskV2 from "plugins/notion/server/tasks/ImportNotionTaskV2";
import { PagePerTask } from "plugins/notion/server/utils";
import BaseProcessor from "./BaseProcessor";

export default class ImportsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "imports.create",
    "imports.processed",
  ];

  public async perform(event: ImportEvent) {
    const importModel = await Import.findByPk(event.modelId, {
      rejectOnEmpty: true,
    });

    switch (event.name) {
      case "imports.create":
        return this.creationFlow(importModel);

      case "imports.processed":
        return this.processedFlow(importModel);
    }
  }

  private async creationFlow(importModel: Import) {
    if (!importModel.input.length) {
      return;
    }

    const tasksInput: ImportTaskInput = importModel.input.map<
      ImportTaskInput[number]
    >((item) => ({ externalId: item.externalId }));

    const importTasks = await sequelize.transaction(async (transaction) => {
      const insertedTasks = await Promise.all(
        chunk(tasksInput, PagePerTask).map((input) =>
          ImportTask.create(
            {
              state: ImportTaskState.Created,
              input,
              importId: importModel.id,
            },
            { transaction }
          )
        )
      );

      importModel.state = ImportState.InProgress;
      await importModel.save({ transaction });

      return insertedTasks;
    });

    await ImportNotionTaskV2.schedule({ importTaskId: importTasks[0].id });
  }

  private async processedFlow(importModel: Import) {
    console.log("inside processed flow");
  }
}
