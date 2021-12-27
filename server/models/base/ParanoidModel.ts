import {
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Column,
  PrimaryKey,
  IsUUID,
} from "sequelize-typescript";
import BaseModel from "./BaseModel";

class ParanoidModel extends BaseModel {
  @IsUUID(4)
  @Column
  @PrimaryKey
  id: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @DeletedAt
  deletedAt: Date | null;
}

export default ParanoidModel;
