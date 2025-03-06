import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  IsIn,
  Table,
} from "sequelize-typescript";
import {
  type ImportData,
  ImportState,
  IntegrationService,
} from "@shared/types";
import Integration from "./Integration";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "imports", modelName: "import" })
@Fix
class Import<T = unknown> extends IdModel<
  InferAttributes<Import<T>>,
  Partial<InferCreationAttributes<Import<T>>>
> {
  @IsIn([Object.values(IntegrationService)])
  @Column(DataType.STRING)
  service: IntegrationService;

  @IsIn([Object.values(ImportState)])
  @Column(DataType.STRING)
  state: ImportState;

  @Column(DataType.JSONB)
  data: ImportData;

  @Default(0)
  @Column(DataType.INTEGER)
  pendingTaskCount: number;

  // associations

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  @BelongsTo(() => Integration, "integrationId")
  integration: Integration;

  @ForeignKey(() => Integration)
  @Column(DataType.UUID)
  integrationId: string;
}

export default Import;
