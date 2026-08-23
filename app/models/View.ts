import { action, observable } from "mobx";
import Note from "./Note";
import User from "./User";
import Model from "./base/Model";
import Relation from "./decorators/Relation";
class View extends Model {
  static modelName = "View";
  noteId: string;
  @Relation(() => Note)
  note?: Note;
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
