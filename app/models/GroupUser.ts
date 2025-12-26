import type { GroupPermission } from "@shared/types";
import Group from "./Group";
import User from "./User";
import Model from "./base/Model";
import Relation from "./decorators/Relation";
import Field from "./decorators/Field";
import { observable } from "mobx";

/**
 * Represents a user's membership to a group.
 */
class GroupUser extends Model {
  static modelName = "GroupUser";

  /** The ID of the user. */
  userId: string;

  /** The user that belongs to the group. */
  @Relation(() => User, { onDelete: "cascade" })
  user: User;

  /** The ID of the group. */
  groupId: string;

  /** The group that the user belongs to. */
  @Relation(() => Group, { onDelete: "cascade" })
  group: Group;

  /** The permission of the user in the group. */
  @Field
  @observable
  permission: GroupPermission;
}

export default GroupUser;
