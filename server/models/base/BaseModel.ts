import {
  Model,
  Column,
  PrimaryKey,
  IsUUID,
  DataType,
} from "sequelize-typescript";

class BaseModel extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUID)
  id: string;
}

export default BaseModel;
