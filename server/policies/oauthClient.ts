import { TeamPreference } from "@shared/types";
import { Team, User, OAuthClient } from "@server/models";
import { allow } from "./cancan";
import { or, isTeamModel, isTeamMutable, and, isTeamAdmin } from "./utils";

allow(User, "createOAuthClient", Team, (actor, team) =>
  and(
    isTeamModel(actor, team),
    isTeamMutable(actor),
    !actor.isViewer,
    !actor.isGuest,
    !actor.isSuspended,
    actor.isAdmin ||
      !!team?.getPreference(TeamPreference.MembersCanCreateApiKey)
  )
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
