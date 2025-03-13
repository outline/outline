import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  IsIn,
  IsNumeric,
  Scopes,
  Table,
} from "sequelize-typescript";
import { type ImportInput } from "@shared/schema";
import { ImportableIntegrationService, ImportState } from "@shared/types";
import { ImportValidation } from "@shared/validations";
import Integration from "./Integration";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";
import NotContainsUrl from "./validators/NotContainsUrl";

@Scopes(() => ({
  withUser: {
    include: [
      {
        association: "createdBy",
        required: true,
      },
    ],
  },
}))
@Table({ tableName: "imports", modelName: "import" })
@Fix
class Import<T extends ImportableIntegrationService> extends IdModel<
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
  pageCount: number;

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
