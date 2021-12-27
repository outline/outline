import {
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Column,
  PrimaryKey,
  IsUUID,
  DataType,
} from "sequelize-typescript";
import BaseModel from "./BaseModel";

class ParanoidModel extends BaseModel {
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUID)
  id: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @DeletedAt
  deletedAt: Date | null;
}

export default ParanoidModel;
