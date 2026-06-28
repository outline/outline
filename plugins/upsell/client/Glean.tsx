import { SearchIcon } from "outline-icons";
import { Trans, useTranslation } from "react-i18next";
import env from "~/env";
import { UpsellScene } from "./components/UpsellScene";

/**
 * Upsell placeholder for the Enterprise-only Glean integration, which surfaces
 * Outline content inside Glean's enterprise search.
 *
 * @returns The rendered upsell scene.
 */
export default function Glean() {
  const { t } = useTranslation();
  const appName = env.APP_NAME;

  return (
    <UpsellScene
      title="Glean"
      icon={<SearchIcon />}
      description={
        <Trans>
          Automatically index and search document content from {{ appName }}{" "}
          inside Glean in realtime.
        </Trans>
      }
      features={[
        {
          name: "glean-index",
          label: t("Realtime indexing"),
          description: t(
            "Keep Glean's search index up to date as documents change."
          ),
          control: "switch",
        },
        {
          name: "glean-datasource",
          label: t("Custom datasource"),
          description: t(
            "Connect your Glean API endpoint, secret, and datasource."
          ),
          control: "switch",
        },
      ]}
    />
  );
}
