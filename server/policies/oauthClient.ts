import { TeamPreference } from "@shared/types";
import { Team, User, OAuthClient } from "@server/models";
import { allow } from "./cancan";
import { or, isTeamModel, isTeamMutable, and, isTeamAdmin } from "./utils";

allow(User, "createOAuthClient", Team, (actor, team) =>
  and(isTeamAdmin(actor, team), isTeamMutable(actor))
);

allow(User, "listOAuthClients", Team, (actor, team) =>
  isTeamAdmin(actor, team)
);

allow(User, "read", OAuthClient, (actor, oauthClient) =>
  and(
    or(isTeamModel(actor, oauthClient), !!oauthClient?.published),
    // Dynamically registered clients exist only to serve MCP, so they become
    // unreachable when the team turns the preference off.
    !oauthClient?.isDCR || !!actor.team?.getPreference(TeamPreference.MCP)
  )
);

allow(User, ["update", "delete"], OAuthClient, (actor, oauthClient) =>
  and(
    isTeamAdmin(actor, oauthClient),
    isTeamMutable(actor),
    !oauthClient?.isDCR
  )
);
