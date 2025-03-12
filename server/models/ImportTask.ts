import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  IsIn,
  Scopes,
  Table,
} from "sequelize-typescript";
import { type ImportTaskInput, ImportTaskOutput } from "@shared/schema";
import { ImportTaskState, IntegrationService } from "@shared/types";
import Import from "./Import";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Scopes(() => ({
  withImport: {
    include: [
      {
        association: "import",
        required: true,
      },
    ],
  },
}))
@Table({ tableName: "import_tasks", modelName: "import_task" })
@Fix
class ImportTask<T extends IntegrationService> extends IdModel<
  InferAttributes<ImportTask<T>>,
  Partial<InferCreationAttributes<ImportTask<T>>>
> {
  @IsIn([Object.values(ImportTaskState)])
  @Column(DataType.STRING)
  state: ImportTaskState;

  @Column(DataType.JSONB)
  input: ImportTaskInput<T>;

  @AllowNull
  @Column(DataType.JSONB)
  output: ImportTaskOutput | null;

  @BelongsTo(() => Import, "importId")
  import: Import<T>;

  @ForeignKey(() => Import)
  @Column(DataType.UUID)
  importId: string;
}

export default ImportTask;
