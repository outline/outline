import { PlanFeature } from "@shared/types";
import { AuthenticationProvider, User, Team } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamAdmin, isTeamModel, teamHasEntitlement } from "./utils";

allow(User, "createAuthenticationProvider", Team, isTeamAdmin);

allow(User, "configureAuthenticationProvider", Team, (actor, team) =>
  and(
    //
    isTeamAdmin(actor, team),
    teamHasEntitlement(team, PlanFeature.OIDC)
  )
);

allow(User, "read", AuthenticationProvider, isTeamModel);

allow(User, ["update", "delete"], AuthenticationProvider, isTeamAdmin);
