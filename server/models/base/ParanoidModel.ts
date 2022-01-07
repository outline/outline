import { DeletedAt } from "sequelize-typescript";
import BaseModel from "./BaseModel";

class ParanoidModel extends BaseModel {
  @DeletedAt
  deletedAt: Date | null;
}

export default ParanoidModel;
