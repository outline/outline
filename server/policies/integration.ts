import { AdminRequiredError } from "../errors";
import { Integration, User, Team } from "../models";
import policy from "./policy";

const { allow } = policy;

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
  (user, integration) => user.teamId === integration.teamId
);

allow(User, ["update", "delete"], Integration, (user, integration) => {
  if (user.isViewer) return false;
  if (!integration || user.teamId !== integration.teamId) return false;
  if (user.isAdmin) return true;
  // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
  throw new AdminRequiredError();
});
