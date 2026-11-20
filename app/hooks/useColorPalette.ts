import { colorPalette } from "@shared/constants";
import { TeamPreference } from "@shared/types";
import useCurrentTeam from "./useCurrentTeam";

/**
 * Returns the preset icon colors for the current workspace, falling back to
 * the default palette when there is no team or no palette preference.
 *
 * @returns the list of hex colors in the active palette.
 */
export default function useColorPalette(): string[] {
  const team = useCurrentTeam({ rejectOnEmpty: false });
  return team?.getPreference(TeamPreference.ColorPalette) || colorPalette;
}
