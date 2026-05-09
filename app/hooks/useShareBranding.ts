import type { PublicTeam } from "@shared/types";
import { useTeamContext } from "~/components/TeamContext";
import type Share from "~/models/Share";
import type Team from "~/models/Team";

type ShareBranding = {
  displayName: string | null;
  displayLogoUrl: string | null;
  displayLogoModel: Team | PublicTeam | undefined;
  brandingAvailable: boolean;
};

/**
 * Returns the resolved branding (name + logo) to display for a share, falling
 * back to the team's name and avatar when the share has no custom values.
 *
 * @param share the share to derive branding for.
 * @returns the resolved name, logo URL, fallback model, and whether any
 * branding is available to display.
 */
export default function useShareBranding(share: Share): ShareBranding {
  const team = useTeamContext();
  const displayName = share.title ?? team?.name ?? null;
  const displayLogoUrl = share.iconUrl ?? team?.avatarUrl ?? null;
  const displayLogoModel = displayLogoUrl ? undefined : team;

  return {
    displayName,
    displayLogoUrl,
    displayLogoModel,
    brandingAvailable: !!(displayName || displayLogoUrl),
  };
}
