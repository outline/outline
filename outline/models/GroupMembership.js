// @flow
import BaseModel from "./BaseModel";

class GroupMembership extends BaseModel {
  id: string;
  userId: string;
  groupId: string;
}

export default GroupMembership;
