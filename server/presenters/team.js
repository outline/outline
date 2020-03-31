// @flow
import { Team } from '../models';

export default function present(team: Team) {
  return {
    id: team.id,
    name: team.name,
    avatarUrl: team.logoUrl,
    slackConnected: !!team.slackId,
    googleConnected: !!team.googleId,
    sharing: team.sharing,
    documentEmbeds: team.documentEmbeds,
    guestSignin: team.guestSignin,
    subdomain: team.subdomain,
    url: team.url,
  };
}
