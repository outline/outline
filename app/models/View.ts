import { action, observable } from "mobx";
import Document from "./Document";
import User from "./User";
import Model from "./base/Model";
import Relation from "./decorators/Relation";

class View extends Model {
  static modelName = "View";

  documentId: string;

  @Relation(() => Document)
  document?: Document;

  firstViewedAt: string;

  @observable
  lastViewedAt: string;

  @observable
  count: number;

  userId: string;

  @Relation(() => User)
  user?: User;

  @action
  touch() {
    this.lastViewedAt = new Date().toString();
  }
}

export default View;
