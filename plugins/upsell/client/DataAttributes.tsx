import { BuildingBlocksIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { PlanFeature } from "@shared/types";
import { UpsellScene } from "~/scenes/Settings/components/UpsellScene";

/**
 * Upsell placeholder for the paid data attributes feature, which
 * allows defining custom structured properties on documents.
 *
 * @returns The rendered upsell scene.
 */
export default function DataAttributes() {
  const { t } = useTranslation();

  return (
    <UpsellScene
      feature={PlanFeature.DataAttributes}
      title={t("Data attributes")}
      icon={<BuildingBlocksIcon />}
      description={t(
        "Attributes allow you to define data to be stored with your documents. They can be used to store custom properties, metadata, or any other structured information that is common across documents."
      )}
    />
  );
}
