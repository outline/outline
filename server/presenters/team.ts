import { Team } from "@server/models";

export default function present(team: Team) {
  return {
    id: team.id,
    name: team.name,
    avatarUrl: team.logoUrl,
    sharing: team.sharing,
    memberCollectionCreate: team.memberCollectionCreate,
    collaborativeEditing: team.collaborativeEditing,
    defaultCollectionId: team.defaultCollectionId,
    documentEmbeds: team.documentEmbeds,
    guestSignin: team.emailSigninEnabled,
    subdomain: team.subdomain,
    domain: team.domain,
    url: team.url,
    defaultUserRole: team.defaultUserRole,
    inviteRequired: team.inviteRequired,
    allowedDomains: team.allowedDomains.map((d) => d.name),
  };
}
