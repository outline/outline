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

class IdModel extends Model {
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
