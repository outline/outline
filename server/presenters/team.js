// @flow
import env from "../env";
import { Team } from "../models";

export default function present(team: Team) {
  return {
    id: team.id,
    name: team.name,
    avatarUrl: team.logoUrl,
    sharing: team.sharing,
    features: {
      multiplayerEditor:
        team.features?.multiplayerEditor && env.MULTIPLAYER_URL,
    },
    documentEmbeds: team.documentEmbeds,
    guestSignin: team.guestSignin,
    subdomain: team.subdomain,
    domain: team.domain,
    url: team.url,
  };
}
