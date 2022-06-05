import {
  CreatedAt,
  UpdatedAt,
  Column,
  PrimaryKey,
  IsUUID,
  DataType,
  Default,
} from "sequelize-typescript";
import BaseModel from "./BaseModel";

class IdModel extends BaseModel {
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
