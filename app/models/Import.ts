import { observable } from "mobx";
import { ImportableIntegrationService, ImportState } from "@shared/types";
import ImportsStore from "~/stores/ImportsStore";
import User from "./User";
import Model from "./base/Model";
import Relation from "./decorators/Relation";

class Import extends Model {
  static modelName = "Import";

  store: ImportsStore;

  /** The name of the import. */
  name: string;

  /** The current state of the import. */
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

  cancel = async () => this.store.cancel(this);
}

export default Import;
