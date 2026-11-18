import { HistoryIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { PlanFeature } from "@shared/types";
import { UpsellScene } from "~/scenes/Settings/components/UpsellScene";

/**
 * Upsell placeholder for the paid audit log, which records security
 * and activity events across the workspace.
 *
 * @returns The rendered upsell scene.
 */
export default function AuditLog() {
  const { t } = useTranslation();

  return (
    <UpsellScene
      feature={PlanFeature.AuditLog}
      title={t("Audit log")}
      icon={<HistoryIcon />}
      description={t(
        "The audit log details the history of security related and other events across your knowledge base."
      )}
    />
  );
}
