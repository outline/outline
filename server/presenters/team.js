// @flow
import { Team } from "../models";

export default function present(team: Team) {
  return {
    id: team.id,
    name: team.name,
    avatarUrl: team.logoUrl,
    sharing: team.sharing,
    documentEmbeds: team.documentEmbeds,
    guestSignin: team.guestSignin,
    multiplayerEditor: team.multiplayerEditor,
    subdomain: team.subdomain,
    domain: team.domain,
    url: team.url,
  };
}
