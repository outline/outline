import { observable } from "mobx";
import Model from "./base/Model";
import Field from "./decorators/Field";

class Group extends Model {
  static modelName = "Group";

  @Field
  @observable
  id: string;

  @Field
  @observable
  name: string;

  @observable
  memberCount: number;
}

export default Group;
