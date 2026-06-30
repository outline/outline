import {
  CreatedAt,
  UpdatedAt,
  Column,
  PrimaryKey,
  IsUUID,
  DataType,
  Default,
} from "sequelize-typescript";
import Model from "./Model";

class IdModel<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors Model base; tightening to object resolves Attributes<M> to never inside Sequelize helpers.
  TModelAttributes extends object = any,
  TCreationAttributes extends object = TModelAttributes,
> extends Model<TModelAttributes, TCreationAttributes> {
  @IsUUID(4)
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default IdModel;
