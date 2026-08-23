import { useTranslation } from "react-i18next";
import { NoteTemplateSettings } from "./NoteTemplate";
/**
 * Wording on the boarding agreement.
 *
 * @returns the rendered agreement settings page.
 */
function Notes() {
  const { t } = useTranslation();
  return (
    <NoteTemplateSettings
      type="agreement"
      title={t("Boarding agreement")}
      description={t("What an owner signs when they leave a pet with us.")}
    />
  );
}
export default Notes;
