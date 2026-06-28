import { HistoryIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { UpsellScene } from "./components/UpsellScene";

/**
 * Upsell placeholder for the Enterprise-only audit log, which records security
 * and activity events across the workspace.
 *
 * @returns The rendered upsell scene.
 */
export default function AuditLog() {
  const { t } = useTranslation();

  return (
    <UpsellScene
      title={t("Audit Log")}
      icon={<HistoryIcon />}
      description={t(
        "The audit log details the history of security related and other events across your knowledge base."
      )}
      features={[
        {
          name: "audit-events",
          label: t("Security events"),
          description: t(
            "Record sign-ins, permission changes, and other sensitive actions with the actor, IP address, and timestamp."
          ),
          control: "none",
        },
        {
          name: "audit-export",
          label: t("Export to CSV"),
          description: t(
            "Download a complete record of events for compliance and reporting."
          ),
          control: "none",
        },
        {
          name: "audit-retention",
          label: t("Extended retention"),
          description: t(
            "Retain event history for longer periods to meet your organization's policies."
          ),
          control: "none",
        },
      ]}
    />
  );
}
