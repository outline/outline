// @flow
import { AdminRequiredError } from "../errors";
import { Integration, User, Team } from "../models";
import policy from "./policy";

const { allow } = policy;

allow(User, "createIntegration", Team, (actor, team) => {
  if (!team || actor.isViewer || actor.teamId !== team.id) return false;
  if (actor.isAdmin) return true;
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
  throw new AdminRequiredError();
});
