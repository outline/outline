import { useTranslation } from "react-i18next";
import { DocumentTemplateSettings } from "./DocumentTemplate";

/**
 * Wording on the boarding agreement.
 *
 * @returns the rendered agreement settings page.
 */
function Documents() {
  const { t } = useTranslation();

  return (
    <DocumentTemplateSettings
      type="agreement"
      title={t("Boarding agreement")}
      description={t("What an owner signs when they leave a pet with us.")}
    />
  );
}

export default Documents;
