import { PagePerImportTask } from "@server/constants";
import { createContext } from "@server/context";
import { Import, ImportTask } from "@server/models";
import { ImportTaskAttributes } from "@server/models/ImportTask";
import { sequelize } from "@server/storage/database";
import { ImportTaskInput, ImportTaskOutput } from "@shared/schema";
import {
  ImportableIntegrationService,
  ImportState,
  ImportTaskState,
} from "@shared/types";
import { JobOptions } from "bull";
import chunk from "lodash/chunk";
import { Transaction, WhereOptions } from "sequelize";
import BaseTask, { TaskPriority } from "./BaseTask";

export type ProcessOutput<T extends ImportableIntegrationService> = {
  taskOutput: ImportTaskOutput;
  childTasksInput: ImportTaskInput<T>;
};

type Props = {
  /** id of the import_task */
  importTaskId: string;
};

export default abstract class APIImportTask<
  T extends ImportableIntegrationService
> extends BaseTask<Props> {
  public async perform({ importTaskId }: Props) {
    let importTask = await ImportTask.findByPk<ImportTask<T>>(importTaskId, {
      rejectOnEmpty: true,
      include: [
        {
          model: Import.scope("withUser"),
          as: "import",
          required: true,
        },
      ],
    });

    switch (importTask.state) {
      case ImportTaskState.Created: {
        importTask.state = ImportTaskState.InProgress;
        importTask = await importTask.save();
        return await this.onProcess(importTask);
      }

      case ImportTaskState.InProgress:
        return await this.onProcess(importTask);

      case ImportTaskState.Completed:
        return await this.onCompletion(importTask);

      default:
    }
  }

  public async onFailed({ importTaskId }: Props) {
    await sequelize.transaction(async (transaction) => {
      const importTask = await ImportTask.findByPk<ImportTask<T>>(
        importTaskId,
        {
          rejectOnEmpty: true,
          include: [
            {
              model: Import.scope("withUser"),
              as: "import",
              required: true,
            },
          ],
          transaction,
          lock: Transaction.LOCK.UPDATE,
        }
      );

      importTask.state = ImportTaskState.Errored;
      await importTask.save({ transaction });

      const associatedImport = importTask.import;
      associatedImport.state = ImportState.Errored;
      await associatedImport.saveWithCtx(
        createContext({
          user: associatedImport.createdBy,
          transaction,
        })
      );
    });
  }

  private async onProcess(importTask: ImportTask<T>) {
    const { taskOutput, childTasksInput } = await this.process(importTask);

    await sequelize.transaction(async (transaction) => {
      await Promise.all(
        chunk(childTasksInput, PagePerImportTask).map(async (input) => {
          await ImportTask.create(
            {
              state: ImportTaskState.Created,
              input,
              importId: importTask.importId,
            },
            { transaction }
          );
        })
      );

      importTask.output = taskOutput;
      importTask.state = ImportTaskState.Completed;
      await importTask.save({ transaction });

      const associatedImport = importTask.import;
      associatedImport.pageCount += importTask.input.length;
      await associatedImport.saveWithCtx(
        createContext({
          user: associatedImport.createdBy,
          transaction,
        })
      );
    });

    await this.scheduleNextTask(importTask);
  }

  private async onCompletion(importTask: ImportTask<T>) {
    const where: WhereOptions<ImportTask<T>> = {
      state: ImportTaskState.Created,
      importId: importTask.importId,
    };

    const nextImportTask = await ImportTask.findOne<ImportTask<T>>({
      where,
    });

    if (nextImportTask) {
      return await this.scheduleNextTask(nextImportTask);
    }

    await sequelize.transaction(async (transaction) => {
      const associatedImport = importTask.import;
      associatedImport.state = ImportState.Processed;
      await associatedImport.saveWithCtx(
        createContext({
          user: associatedImport.createdBy,
          transaction,
        }),
        undefined,
        { name: "processed" }
      );
    });
  }

  protected abstract process(
    importTask: ImportTask<T>
  ): Promise<ProcessOutput<T>>;

  protected abstract scheduleNextTask(importTask: ImportTask<T>): Promise<void>;

  public get options(): JobOptions {
    return {
      priority: TaskPriority.Normal,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 60 * 1000,
      },
    };
  }
}
