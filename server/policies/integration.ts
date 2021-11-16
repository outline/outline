import { AdminRequiredError } from "../errors";
import { Integration, User, Team } from "../models";
import policy from "./policy";

const { allow } = policy;
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'actor' implicitly has an 'any' type.
allow(User, "createIntegration", Team, (actor, team) => {
  if (!team || actor.isViewer || actor.teamId !== team.id) return false;
  if (actor.isAdmin) return true;
  // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
  throw new AdminRequiredError();
});
allow(
  User,
  "read",
  Integration,
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'user' implicitly has an 'any' type.
  (user, integration) => user.teamId === integration.teamId
);
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'user' implicitly has an 'any' type.
allow(User, ["update", "delete"], Integration, (user, integration) => {
  if (user.isViewer) return false;
  if (!integration || user.teamId !== integration.teamId) return false;
  if (user.isAdmin) return true;
  // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
  throw new AdminRequiredError();
});
