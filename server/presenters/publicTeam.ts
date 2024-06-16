import { TOCPosition, TeamPreference } from "@shared/types";
import { Team } from "@server/models";

export default function presentPublicTeam(team: Team) {
  return {
    name: team.name,
    avatarUrl: team.avatarUrl,
    customTheme: team.getPreference(TeamPreference.CustomTheme),
    tocPosition: team.getPreference(TeamPreference.TocPosition) as TOCPosition,
  };
}
