import { AuthenticationProvider, User, Team } from "@server/models";
import { AdminRequiredError } from "../errors";
import { allow } from "./cancan";

allow(User, "createAuthenticationProvider", Team, (actor, team) => {
  if (!team || actor.teamId !== team.id) {
    return false;
  }
  if (actor.isAdmin) {
    return true;
  }

  throw AdminRequiredError();
});

allow(
  User,
  "read",
  AuthenticationProvider,

  (actor, authenticationProvider) =>
    actor && actor.teamId === authenticationProvider?.teamId
);

allow(
  User,
  ["update", "delete"],
  AuthenticationProvider,

  (actor, authenticationProvider) => {
    if (actor.teamId !== authenticationProvider?.teamId) {
      return false;
    }
    if (actor.isAdmin) {
      return true;
    }

    throw AdminRequiredError();
  }
);
