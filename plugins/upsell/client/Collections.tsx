import { CollectionIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { UpsellScene } from "./components/UpsellScene";

/**
 * Upsell placeholder for the Enterprise-only collection management page, which
 * lets workspace admins administer the permissions and settings of every
 * collection, including private ones.
 *
 * @returns The rendered upsell scene.
 */
export default function Collections() {
  const { t } = useTranslation();

  return (
    <UpsellScene
      title={t("Collections")}
      icon={<CollectionIcon />}
      description={t(
        "Manage the permissions and settings of all collections in the knowledge base. As a workspace admin you can also administer private collections."
      )}
      features={[
        {
          name: "collections-administer-private",
          label: t("Administer private collections"),
          description: t(
            "View and manage collections that have not been explicitly shared with you."
          ),
          control: "none",
        },
        {
          name: "collections-bulk-permissions",
          label: t("Bulk permissions"),
          description: t(
            "Review and update sharing and access for every collection from one place."
          ),
          control: "none",
        },
      ]}
    />
  );
}
