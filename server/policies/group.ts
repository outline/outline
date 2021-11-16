import { AdminRequiredError } from "../errors";
import { Group, User, Team } from "../models";
import policy from "./policy";

const { allow } = policy;
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'actor' implicitly has an 'any' type.
allow(User, "createGroup", Team, (actor, team) => {
  if (!team || actor.isViewer || actor.teamId !== team.id) return false;
  if (actor.isAdmin) return true;
  // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
  throw new AdminRequiredError();
});
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'actor' implicitly has an 'any' type.
allow(User, "read", Group, (actor, group) => {
  if (!group || actor.teamId !== group.teamId) return false;
  if (actor.isAdmin) return true;

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'gm' implicitly has an 'any' type.
  if (group.groupMemberships.filter((gm) => gm.userId === actor.id).length) {
    return true;
  }

  return false;
});
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'actor' implicitly has an 'any' type.
allow(User, ["update", "delete"], Group, (actor, group) => {
  if (!group || actor.isViewer || actor.teamId !== group.teamId) return false;
  if (actor.isAdmin) return true;
  // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
  throw new AdminRequiredError();
});
