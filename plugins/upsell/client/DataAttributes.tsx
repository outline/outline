import { BuildingBlocksIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { UpsellScene } from "./components/UpsellScene";

/**
 * Upsell placeholder for the Enterprise-only data attributes feature, which
 * allows defining custom structured properties on documents.
 *
 * @returns The rendered upsell scene.
 */
export default function DataAttributes() {
  const { t } = useTranslation();

  return (
    <UpsellScene
      title={t("Data Attributes")}
      icon={<BuildingBlocksIcon />}
      description={t(
        "Attributes allow you to define data to be stored with your documents. They can be used to store custom properties, metadata, or any other structured information that is common across documents."
      )}
      features={[
        {
          name: "data-attributes-types",
          label: t("Custom property types"),
          description: t(
            "Define attributes as text, number, boolean, or list values."
          ),
          control: "switch",
        },
        {
          name: "data-attributes-search",
          label: t("Search and filter"),
          description: t(
            "Find documents by their attribute values across the workspace."
          ),
          control: "switch",
        },
      ]}
    />
  );
}
