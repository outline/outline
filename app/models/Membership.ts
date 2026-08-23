import { observable } from "mobx";
import type { NotebookPermission } from "@shared/types";
import Notebook from "./Notebook";
import User from "./User";
import Model from "./base/Model";
import Relation from "./decorators/Relation";
import { WireAlias } from "./decorators/Field";
class Membership extends Model {
  static modelName = "Membership";
  userId: string;
  @Relation(() => User, { onDelete: "cascade" })
  user: User;
  @WireAlias("collectionId")
  notebookId: string;
  @Relation(() => Notebook, { onDelete: "cascade" })
  notebook: Notebook;
  @observable
  permission: NotebookPermission;
}
export default Membership;
