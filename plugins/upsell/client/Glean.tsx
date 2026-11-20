import { SearchIcon } from "outline-icons";
import { Trans } from "react-i18next";
import env from "~/env";
import { PlanFeature } from "@shared/types";
import { UpsellScene } from "~/scenes/Settings/components/UpsellScene";

/**
 * Upsell placeholder for the paid Glean integration, which surfaces
 * Outline content inside Glean's enterprise search.
 *
 * @returns The rendered upsell scene.
 */
export default function Glean() {
  const appName = env.APP_NAME;

  return (
    <UpsellScene
      feature={PlanFeature.PremiumIntegrations}
      title="Glean"
      icon={<SearchIcon />}
      description={
        <Trans>
          Automatically index and search document content from {{ appName }}{" "}
          inside Glean in realtime.
        </Trans>
      }
    />
  );
}
