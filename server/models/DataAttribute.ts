import {
  InferAttributes,
  InferCreationAttributes,
  type SaveOptions,
} from "sequelize";
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
import { z } from "zod";
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

  /** Additional options for some datatypes. */
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
  static async checkMaximumAttributes(
    model: DataAttribute,
    { transaction }: SaveOptions<DataAttribute>
  ) {
    const count = await this.count({
      where: {
        teamId: model.teamId,
      },
      transaction,
    });

    if (count >= DataAttributeValidation.max) {
      throw new Error("Maximum number of attributes reached");
    }
  }

  /**
   * The Zod type for validating this data attribute.
   */
  get zodType() {
    switch (this.dataType) {
      case DataAttributeDataType.String:
        return z.string();
      case DataAttributeDataType.Number:
        return z.number();
      case DataAttributeDataType.Boolean:
        return z.boolean();
      case DataAttributeDataType.List:
        return z
          .string()
          .refine((value) => this.options.values.includes(value));
      default:
        throw new Error(`Unknown data type: ${this.dataType}`);
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
