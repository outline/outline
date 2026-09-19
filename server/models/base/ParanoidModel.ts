import { BeforeDestroy, BeforeRestore, DeletedAt } from "sequelize-typescript";
import IdModel from "./IdModel";
import type { HookContext } from "./Model";

/** The optional column recording the user that deleted a row. */
const DeletedByField = "deletedById";

class ParanoidModel<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors Model base; tightening to object resolves Attributes<M> to never inside Sequelize helpers.
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

  /**
   * Records the acting user against a model that has a `deletedById` column.
   * Sequelize soft deletes with the same UPDATE that writes `deletedAt`, so the
   * value set here is persisted without an additional query.
   *
   * @param model The model being deleted.
   * @param context The hook context, which provides the acting user.
   */
  @BeforeDestroy
  static async setDeletedBy(model: ParanoidModel, context: HookContext) {
    const userId = context.auth?.user?.id;

    if (userId && DeletedByField in this.rawAttributes) {
      model.setDataValue(DeletedByField, userId);
    }
  }

  /**
   * Clears the recorded deleting user when a model is restored, so that a row
   * which is no longer deleted carries no attribution.
   *
   * @param model The model being restored.
   */
  @BeforeRestore
  static async unsetDeletedBy(model: ParanoidModel) {
    if (DeletedByField in this.rawAttributes) {
      model.setDataValue(DeletedByField, null);
    }
  }
}

export default ParanoidModel;
