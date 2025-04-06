import { Team, User, OAuthClient } from "@server/models";
import { allow } from "./cancan";
import { or, isTeamModel, isTeamMutable, and, isTeamAdmin } from "./utils";

allow(User, "createOAuthClient", Team, (actor, team) =>
  and(isTeamModel(actor, team), isTeamMutable(actor), actor.isAdmin)
);

allow(User, "listOAuthClients", Team, (actor, team) =>
  isTeamAdmin(actor, team)
);

allow(User, "read", OAuthClient, (actor, oauthClient) =>
  or(isTeamModel(actor, oauthClient), !!oauthClient?.published)
);

allow(User, ["update", "delete"], OAuthClient, (actor, oauthClient) =>
  and(isTeamModel(actor, oauthClient), isTeamMutable(actor), actor.isAdmin)
);
