import { pick } from "es-toolkit";
import { TeamPreference } from "@shared/types";
import type { Team } from "@server/models";

export default function presentTeam(team: Team) {
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    avatarUrl: team.avatarUrl,
    sharing: team.sharing,
    memberCollectionCreate: team.memberCollectionCreate,
    memberTeamCreate: team.memberTeamCreate,
    defaultCollectionId: team.defaultCollectionId,
    documentEmbeds: team.documentEmbeds,
    guestSignin: team.emailSigninEnabled,
    passkeysEnabled: team.passkeysEnabled,
    subdomain: team.subdomain,
    domain: team.domain,
    url: team.url,
    defaultUserRole: team.defaultUserRole,
    inviteRequired: team.inviteRequired,
    allowedDomains: team.allowedDomains?.map((d) => d.name),
    // Unrecognized keys are omitted so that clients can safely send the object back.
    preferences: team.preferences
      ? pick(team.preferences, Object.values(TeamPreference))
      : team.preferences,
    guidanceMCP: team.guidanceMCP,
  };
}
