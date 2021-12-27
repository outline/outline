import { Model, Column, PrimaryKey, IsUUID } from "sequelize-typescript";

class BaseModel extends Model {
  @IsUUID(4)
  @Column
  @PrimaryKey
  id: string;
}

export default BaseModel;
