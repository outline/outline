import { TOCPosition, TeamPreference } from "@shared/types";
import { Team } from "@server/models";

export default function presentPublicTeam(
  /** The team to present */
  team: Team,
  /** Whether the branding is public */
  isBrandingPublic: boolean
) {
  return {
    ...(isBrandingPublic
      ? {
          name: team.name,
          avatarUrl: team.avatarUrl,
          customTheme: team.getPreference(TeamPreference.CustomTheme),
        }
      : {}),
    tocPosition: team.getPreference(TeamPreference.TocPosition) as TOCPosition,
  };
}
