// @flow
import { AdminRequiredError } from "../errors";
import { AuthenticationProvider, User, Team } from "../models";
import policy from "./policy";

const { allow } = policy;

allow(User, "createAuthenticationProvider", Team, (actor, team) => {
  if (!team || actor.teamId !== team.id) return false;
  if (actor.isAdmin) return true;
  throw new AdminRequiredError();
});

allow(
  User,
  "read",
  AuthenticationProvider,
  (actor, authenticationProvider) =>
    actor && actor.teamId === authenticationProvider.teamId
);

allow(
  User,
  ["update", "delete"],
  AuthenticationProvider,
  (actor, authenticationProvider) => {
    if (actor.teamId !== authenticationProvider.teamId) return false;
    if (actor.isAdmin) return true;
    throw new AdminRequiredError();
  }
);
