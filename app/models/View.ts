import { action, observable } from "mobx";
import User from "./User";
import Model from "./base/Model";

class View extends Model {
  id: string;

  documentId: string;

  firstViewedAt: string;

  @observable
  lastViewedAt: string;

  @observable
  count: number;

  user: User;

  @action
  touch() {
    this.lastViewedAt = new Date().toString();
  }
}

export default View;
