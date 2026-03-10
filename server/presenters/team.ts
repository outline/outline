import env from "@server/env";
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
    allowedDomains: env.ALLOWED_DOMAINS
      ? env.ALLOWED_DOMAINS.split(",")
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean)
      : team.allowedDomains?.map((d) => d.name),
    domainsManagedByEnv: !!env.ALLOWED_DOMAINS,
    preferences: team.preferences,
  };
}
