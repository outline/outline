import { AuthenticationProvider, User, Team } from "@server/models";
import { AdminRequiredError } from "../errors";
import policy from "./policy";

const { allow } = policy;

allow(User, "createAuthenticationProvider", Team, (actor, team) => {
  if (!team || actor.teamId !== team.id) return false;
  if (actor.isAdmin) return true;
  // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
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
    // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
    throw new AdminRequiredError();
  }
);
