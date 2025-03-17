import { observable } from "mobx";
import { ImportableIntegrationService, ImportState } from "@shared/types";
import User from "./User";
import Model from "./base/Model";
import Relation from "./decorators/Relation";

class Import extends Model {
  static modelName = "Import";

  name: string;

  @observable
  state: ImportState;

  service: ImportableIntegrationService;

  @observable
  pageCount: number;

  @Relation(() => User, {})
  createdBy: User;

  createdById: string;
}

export default Import;
