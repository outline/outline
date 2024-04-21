import { Team } from "@server/models";

export default function presentTeam(team: Team) {
  return {
    id: team.id,
    name: team.name,
    avatarUrl: team.avatarUrl,
    sharing: team.sharing,
    memberCollectionCreate: team.memberCollectionCreate,
    memberTeamCreate: team.memberTeamCreate,
    defaultCollectionId: team.defaultCollectionId,
    documentEmbeds: team.documentEmbeds,
    guestSignin: team.emailSigninEnabled,
    subdomain: team.subdomain,
    domain: team.domain,
    url: team.url,
    defaultUserRole: team.defaultUserRole,
    inviteRequired: team.inviteRequired,
    allowedDomains: team.allowedDomains?.map((d) => d.name),
    preferences: team.preferences,
  };
}
