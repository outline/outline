import { Group, User, Team } from "@server/models";
import { AdminRequiredError } from "../errors";
import policy from "./policy";

const { allow } = policy;

allow(User, "createGroup", Team, (actor, team) => {
  if (!team || actor.isViewer || actor.teamId !== team.id) return false;
  if (actor.isAdmin) return true;
  // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
  throw new AdminRequiredError();
});

allow(User, "read", Group, (actor, group) => {
  // for the time being, we're going to let everyone on the team see every group
  // we may need to make this more granular in the future
  if (!group || actor.teamId !== group.teamId) return false;
  return true;
});

allow(User, ["update", "delete"], Group, (actor, group) => {
  if (!group || actor.isViewer || actor.teamId !== group.teamId) return false;
  if (actor.isAdmin) return true;
  // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
  throw new AdminRequiredError();
});
