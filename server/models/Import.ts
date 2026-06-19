import type {
  InferAttributes,
  InferCreationAttributes,
  SaveOptions,
} from "sequelize";
import {
  AllowNull,
  BeforeCreate,
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
import { type ImportInput, type ImportScratch } from "@shared/schema";
import { ImportableIntegrationService, ImportState } from "@shared/types";
import { ImportValidation } from "@shared/validations";
import { UnprocessableEntityError } from "@server/errors";
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

  @AllowNull
  @Column(DataType.JSONB)
  scratch: ImportScratch<T> | null;

  @IsNumeric
  @Default(0)
  @Column(DataType.INTEGER)
  documentCount: number;

  @Column
  error: string | null;

  // associations

  @BelongsTo(() => Integration, "integrationId")
  integration: Integration | null;

  @AllowNull
  @ForeignKey(() => Integration)
  @Column(DataType.UUID)
  integrationId: string | null;

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

  /**
   * Serializes imports per team — blocks creation while another import is
   * already in flight. Centralizing the check here lets every code path that
   * creates an Import (route handlers, integrations) share one definition of
   * "in progress" without duplicating the count query.
   */
  @BeforeCreate
  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  static async checkInProgress(model: Import<any>, options: SaveOptions) {
    const inProgress = await this.count({
      where: {
        teamId: model.teamId,
        state: [
          ImportState.Created,
          ImportState.InProgress,
          ImportState.Processed,
        ],
      },
      transaction: options.transaction,
    });
    if (inProgress) {
      throw UnprocessableEntityError("An import is already in progress");
    }
  }
}

export default Import;
