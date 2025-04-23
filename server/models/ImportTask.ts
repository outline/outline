import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  IsIn,
  Table,
} from "sequelize-typescript";
import { type ImportTaskInput, ImportTaskOutput } from "@shared/schema";
import { ImportableIntegrationService, ImportTaskState } from "@shared/types";
import Import from "./Import";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

// Not all fields are automatically inferred by Sequelize.
// see https://sequelize.org/docs/v7/models/model-typing/#manual-attribute-typing
type NonInferredAttributes<T extends ImportableIntegrationService> = {
  input: ImportTaskInput<T>;
};

export type ImportTaskAttributes<T extends ImportableIntegrationService> =
  InferAttributes<ImportTask<T>> & NonInferredAttributes<T>;

export type ImportTaskCreationAttributes<
  T extends ImportableIntegrationService
> = Partial<InferCreationAttributes<ImportTask<T>>> &
  Partial<NonInferredAttributes<T>>;

@Table({ tableName: "import_tasks", modelName: "import_task" })
@Fix
class ImportTask<T extends ImportableIntegrationService> extends IdModel<
  ImportTaskAttributes<T>,
  ImportTaskCreationAttributes<T>
> {
  @IsIn([Object.values(ImportTaskState)])
  @Column(DataType.STRING)
  state: ImportTaskState;

  @Column(DataType.JSONB)
  input: ImportTaskInput<T>;

  @AllowNull
  @Column(DataType.JSONB)
  output: ImportTaskOutput | null;

  @Column
  error: string | null;

  // associations

  @BelongsTo(() => Import, "importId")
  import: Import<T>;

  @ForeignKey(() => Import)
  @Column(DataType.UUID)
  importId: string;
}

export default ImportTask;
