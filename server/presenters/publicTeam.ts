import { Team } from "@server/models";

export default function presentPublicTeam(team: Team) {
  return {
    name: team.name,
    avatarUrl: team.avatarUrl,
    customTheme: team.preferences?.customTheme,
  };
}
