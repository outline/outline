import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  DefaultScope,
  ForeignKey,
  IsIn,
  IsNumeric,
  Table,
} from "sequelize-typescript";
import { type ImportInput } from "@shared/schema";
import { ImportableIntegrationService, ImportState } from "@shared/types";
import { ImportValidation } from "@shared/validations";
import Integration from "./Integration";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";
import NotContainsUrl from "./validators/NotContainsUrl";

@DefaultScope(() => ({
  include: [
    {
      association: "createdBy",
      required: true,
      paranoid: false,
    },
  ],
}))
@Table({ tableName: "imports", modelName: "import" })
@Fix
class Import<T extends ImportableIntegrationService> extends ParanoidModel<
  InferAttributes<Import<T>>,
  Partial<InferCreationAttributes<Import<T>>>
> {
  @NotContainsUrl
  @Length({
    max: ImportValidation.maxNameLength,
    msg: `name must be ${ImportValidation.maxNameLength} characters or less`,
  })
  @Column(DataType.STRING)
  name: string;

  @IsIn([Object.values(ImportableIntegrationService)])
  @Column(DataType.STRING)
  service: T;

  @IsIn([Object.values(ImportState)])
  @Column(DataType.STRING)
  state: ImportState;

  @Column(DataType.JSONB)
  input: ImportInput<T>;

  @IsNumeric
  @Default(0)
  @Column(DataType.INTEGER)
  documentCount: number;

  @Column
  error: string | null;

  // associations

  @BelongsTo(() => Integration, "integrationId")
  integration: Integration;

  @ForeignKey(() => Integration)
  @Column(DataType.UUID)
  integrationId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;
}

export default Import;
