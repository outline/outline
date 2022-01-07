import {
  CreatedAt,
  UpdatedAt,
  Column,
  PrimaryKey,
  IsUUID,
  DataType,
  Model,
  Default,
} from "sequelize-typescript";

class BaseModel extends Model {
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

export default BaseModel;
