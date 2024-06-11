import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Column,
  Table,
  BelongsTo,
  ForeignKey,
  AllowNull,
  IsIn,
  DataType,
  Default,
} from "sequelize-typescript";
import { DataAttributeValidation } from "@shared/validations";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";
import NotContainsUrl from "./validators/NotContainsUrl";

export enum DataAttributeDataType {
  String = "string",
  Integer = "integer",
  Boolean = "boolean",
  List = "list",
}

export type DataAttributeOptions = {
  options: string[];
};

@Table({ tableName: "data_attributes", modelName: "data_attribute" })
@Fix
class DataAttribute extends ParanoidModel<
  InferAttributes<DataAttribute>,
  Partial<InferCreationAttributes<DataAttribute>>
> {
  @Length({
    min: DataAttributeValidation.minNameLength,
    max: DataAttributeValidation.maxNameLength,
    msg: `Name must be between ${DataAttributeValidation.minNameLength} and ${DataAttributeValidation.maxNameLength} characters`,
  })
  @NotContainsUrl
  @Column
  name: string;

  @AllowNull
  @Column
  description: string;

  @IsIn([Object.values(DataAttributeDataType)])
  @Column(DataType.ENUM(...Object.values(DataAttributeDataType)))
  dataType: DataAttributeDataType;

  @AllowNull
  @Column(DataType.JSONB)
  options: DataAttributeOptions;

  @Default(false)
  @Column
  pinned: boolean;

  @Column
  index: string;

  @AllowNull
  @Column
  archivedAt: Date | null;

  // hooks

  // associations

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column
  createdById: string;

  @BelongsTo(() => Team)
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;
}

export default DataAttribute;
