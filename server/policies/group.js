// @flow
import { AdminRequiredError } from "../errors";
import { Group, User, Team } from "../models";
import policy from "./policy";

const { allow, can } = policy;

allow(User, "createGroup", Team, (actor, team) => {
  if (!team || actor.isViewer || actor.teamId !== team.id) return false;
  if (actor.isAdmin) return true;
  throw new AdminRequiredError();
});

allow(User, "use", Group, (actor, group) => {
  if (!group || actor.teamId !== group.teamId) return false;
  if (actor.isAdmin || !group.isPrivate) return true;
  if (group.groupMemberships.filter((gm) => gm.userId === actor.id).length) {
    return true;
  }
  return false;
});

allow(User, "read", Group, (actor, group) => {
  if (!group || actor.teamId !== group.teamId) return false;
  if (actor.isAdmin || !group.isPrivate) return true;
  if (group.groupMemberships.filter((gm) => gm.userId === actor.id).length) {
    return true;
  }

  if (
    group.collectionGroupMemberships &&
    group.collectionGroupMemberships.some((membership) =>
      can(actor, "read", membership.collection)
    )
  )
    return true;

  return false;
});

allow(User, ["update", "delete"], Group, (actor, group) => {
  if (!group || actor.isViewer || actor.teamId !== group.teamId) return false;
  if (actor.isAdmin) return true;
  throw new AdminRequiredError();
});
