import User from "./User";
import Model from "./base/Model";

class GroupMembership extends Model {
  id: string;

  userId: string;

  groupId: string;

  user: User;
}

export default GroupMembership;
