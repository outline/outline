import { Team, User, OAuthAuthentication } from "@server/models";
import { allow } from "./cancan";
import { isTeamModel } from "./utils";

allow(User, "listOAuthAuthentications", Team, (actor, team) =>
  isTeamModel(actor, team)
);

allow(
  User,
  ["read", "delete"],
  OAuthAuthentication,
  (actor, oauthAuthentication) => actor?.id === oauthAuthentication?.userId
);
