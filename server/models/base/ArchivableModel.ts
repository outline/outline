import { AllowNull, Column, IsDate } from "sequelize-typescript";
import ParanoidModel from "./ParanoidModel";

class ArchivableModel<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors Model base; tightening to object resolves Attributes<M> to never inside Sequelize helpers.
  TModelAttributes extends object = any,
  TCreationAttributes extends object = TModelAttributes,
> extends ParanoidModel<TModelAttributes, TCreationAttributes> {
  /** Whether the document is archived, and if so when. */
  @AllowNull
  @IsDate
  @Column
  archivedAt: Date | null;

  /**
   * Whether the model has been archived.
   *
   * @returns True if the model has been archived
   */
  get isArchived() {
    return !!this.archivedAt;
  }
}

export default ArchivableModel;
