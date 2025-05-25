import { observable } from "mobx";
import { ImportableIntegrationService, ImportState } from "@shared/types";
import ImportsStore from "~/stores/ImportsStore";
import User from "./User";
import Model from "./base/Model";
import Field from "./decorators/Field";
import { AfterChange } from "./decorators/Lifecycle";
import Relation from "./decorators/Relation";

class Import extends Model {
  static modelName = "Import";

  store: ImportsStore;

  /** The name of the import. */
  name: string;

  /** Descriptive error message when the import errors out. */
  error: string | null;

  /** The current state of the import. */
  @Field
  @observable
  state: ImportState;

  /** The external service from which the import is created. */
  service: ImportableIntegrationService;

  /** The count of documents created in the import. */
  @observable
  documentCount: number;

  /** The user who created the import. */
  @Relation(() => User, {})
  createdBy: User;

  /** The ID of the user who created the import. */
  createdById: string;

  /**
   * Cancel the import – this will stop the import process and mark it as
   * cancelled at the first opportunity.
   */
  cancel = async () => this.store.cancel(this);

  // hooks

  @AfterChange
  static removePolicies(model: Import, previousAttributes: Partial<Import>) {
    if (previousAttributes.state && previousAttributes.state !== model.state) {
      const { policies } = model.store.rootStore;
      policies.remove(model.id);
    }
  }
}

export default Import;
