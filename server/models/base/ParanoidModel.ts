import { DeletedAt } from "sequelize-typescript";
import IdModel from "./IdModel";

class ParanoidModel<
  TModelAttributes extends object = any,
  TCreationAttributes extends object = TModelAttributes,
> extends IdModel<TModelAttributes, TCreationAttributes> {
  @DeletedAt
  deletedAt: Date | null;

  /**
   * Whether the model has been deleted.
   *
   * @returns True if the model has been deleted
   */
  get isDeleted() {
    return !!this.deletedAt;
  }
}

export default ParanoidModel;
