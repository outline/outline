import { useTranslation } from "react-i18next";
import { DocumentTemplateSettings } from "./DocumentTemplate";

/**
 * Wording on the point of sale receipt.
 *
 * @returns the rendered receipt settings page.
 */
function Receipts() {
  const { t } = useTranslation();

  return (
    <DocumentTemplateSettings
      type="receipt"
      title={t("Receipts")}
      description={t("What prints at the till after a sale.")}
    />
  );
}

export default Receipts;
