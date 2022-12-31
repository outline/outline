import { Team } from "@server/models";

export default function presentAvailableTeam(team: Team, isSignedIn = false) {
  return {
    id: team.id,
    name: team.name,
    avatarUrl: team.avatarUrl,
    url: team.url,
    isSignedIn,
  };
}
