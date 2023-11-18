import User from "./User";
import Model from "./base/Model";
import Relation from "./decorators/Relation";

class GroupMembership extends Model {
  id: string;

  userId: string;

  groupId: string;

  @Relation(() => User, { onDelete: "cascade" })
  user: User;
}

export default GroupMembership;
