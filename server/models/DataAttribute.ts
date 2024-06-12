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
  BeforeCreate,
} from "sequelize-typescript";
import {
  DataAttributeDataType,
  type DataAttributeOptions,
} from "@shared/models/types";
import { DataAttributeValidation } from "@shared/validations";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";
import NotContainsUrl from "./validators/NotContainsUrl";

@Table({
  tableName: "data_attributes",
  modelName: "data_attribute",
  paranoid: true,
})
@Fix
class DataAttribute extends ParanoidModel<
  InferAttributes<DataAttribute>,
  Partial<InferCreationAttributes<DataAttribute>>
> {
  /** The name of this data attribute. */
  @Length({
    min: DataAttributeValidation.minNameLength,
    max: DataAttributeValidation.maxNameLength,
    msg: `Name must be between ${DataAttributeValidation.minNameLength} and ${DataAttributeValidation.maxNameLength} characters`,
  })
  @NotContainsUrl
  @Column
  name: string;

  /** A user-facing description for the data attribute. */
  @AllowNull
  @Column
  description: string;

  /** The data type of this data attribute. Cannot be changed after creation. */
  @IsIn([Object.values(DataAttributeDataType)])
  @Column(DataType.ENUM(...Object.values(DataAttributeDataType)))
  dataType: DataAttributeDataType;

  /** Options for `list` data type. */
  @AllowNull
  @Column(DataType.JSONB)
  options: DataAttributeOptions;

  /** Whether this data attribute is pinned to the top of the document. */
  @Default(false)
  @Column
  pinned: boolean;

  /** The sort index of this data attribute. */
  @Column
  index: string;

  // hooks
  @BeforeCreate
  static async checkMaximumAttributes(model: DataAttribute) {
    const count = await DataAttribute.count({
      where: {
        teamId: model.teamId,
      },
    });

    if (count >= DataAttributeValidation.max) {
      throw new Error("Maximum number of attributes reached");
    }
  }

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
