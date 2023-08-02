import { TeamPreference } from "@shared/types";
import { Team } from "@server/models";

export default function presentPublicTeam(team: Team) {
  return {
    name: team.name,
    avatarUrl: team.avatarUrl,
    customTheme: team.getPreference(TeamPreference.CustomTheme),
  };
}
