import BaseModel from "./BaseModel";
import User from "./User";

class GroupMembership extends BaseModel {
  id: string;

  userId: string;

  groupId: string;

  user: User;
}

export default GroupMembership;
