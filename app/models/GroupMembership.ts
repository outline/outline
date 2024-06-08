import Group from "./Group";
import User from "./User";
import Model from "./base/Model";
import Relation from "./decorators/Relation";

class GroupMembership extends Model {
  static modelName = "GroupMembership";

  userId: string;

  @Relation(() => User, { onDelete: "cascade" })
  user: User;

  groupId: string;

  @Relation(() => Group, { onDelete: "cascade" })
  group: Group;
}

export default GroupMembership;
