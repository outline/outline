// @flow
import policy from "./policy";
import { Group, User } from "../models";
import { AdminRequiredError } from "../errors";

const { allow } = policy;

allow(User, ["create"], Group, actor => {
  if (actor.isAdmin) return true;
  throw new AdminRequiredError();
});

allow(User, ["update", "delete"], Group, (actor, group) => {
  if (!group || actor.teamId !== group.teamId) return false;
  if (actor.isAdmin) return true;
  throw new AdminRequiredError();
});

allow(User, ["read"], Group, (actor, group) => {
  if (!group || actor.teamId !== group.teamId) return false;
  if (actor.isAdmin) return true;
  if (group.groupMemberships.filter(gm => gm.userId === actor.id).length) {
    return true;
  }
  return false;
});
