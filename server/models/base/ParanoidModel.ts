import { DeletedAt } from "sequelize-typescript";
import IdModel from "./IdModel";

class ParanoidModel extends IdModel {
  @DeletedAt
  deletedAt: Date | null;
}

export default ParanoidModel;
