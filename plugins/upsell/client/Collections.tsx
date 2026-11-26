import { CollectionIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { PlanFeature } from "@shared/types";
import { UpsellScene } from "~/scenes/Settings/components/UpsellScene";

/**
 * Upsell placeholder for the paid collection management page, which
 * lets workspace admins administer the permissions and settings of every
 * collection, including private ones.
 *
 * @returns The rendered upsell scene.
 */
export default function Collections() {
  const { t } = useTranslation();

  return (
    <UpsellScene
      feature={PlanFeature.ContentManagement}
      title={t("Content")}
      icon={<CollectionIcon />}
      description={t(
        "Manage the permissions and settings of all collections in the knowledge base. As a workspace admin you can also administer private collections."
      )}
    />
  );
}
