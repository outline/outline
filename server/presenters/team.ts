import { Team } from "@server/models";

export default function present(team: Team) {
  return {
    id: team.id,
    name: team.name,
    avatarUrl: team.logoUrl,
    sharing: team.sharing,
    collaborativeEditing: team.collaborativeEditing,
    defaultCollectionId: team.defaultCollectionId,
    documentEmbeds: team.documentEmbeds,
    guestSignin: team.guestSignin,
    subdomain: team.subdomain,
    domain: team.domain,
    url: team.url,
    defaultUserRole: team.defaultUserRole,
  };
}
