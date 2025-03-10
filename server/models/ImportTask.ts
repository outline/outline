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
import {
  type ImportTaskInput,
  ImportTaskState,
  ProsemirrorData,
} from "@shared/types";
import Import from "./Import";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "import_tasks", modelName: "import_task" })
@Fix
class ImportTask<T = unknown> extends IdModel<
  InferAttributes<ImportTask<T>>,
  Partial<InferCreationAttributes<ImportTask<T>>>
> {
  @IsIn([Object.values(ImportTaskState)])
  @Column(DataType.STRING)
  state: ImportTaskState;

  @Column(DataType.JSONB)
  input: ImportTaskInput;

  @AllowNull
  @Column(DataType.JSONB)
  output: ProsemirrorData | null;

  @BelongsTo(() => Import, "importId")
  import: Import;

  @ForeignKey(() => Import)
  @Column(DataType.UUID)
  importId: string;
}

export default ImportTask;
