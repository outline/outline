import { observer } from "mobx-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import PlaceholderDocument from "~/components/PlaceholderDocument";
import Scene from "~/components/Scene";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { settingsPath } from "~/utils/routeHelpers";
import history from "~/utils/history";

function TemplateNewScene() {
  const { t } = useTranslation();
  const { templates } = useStores();
  const params = useQuery();
  const collectionId = params.get("collectionId") || undefined;

  useEffect(() => {
    // The template is created up front, as an unpublished draft, so that
    // anything written is persisted from the very first keystroke.
    async function createTemplate() {
      try {
        const template = await templates.create(
          { title: "", collectionId },
          { publish: false }
        );
        history.replace(template.path);
      } catch (_err) {
        toast.error(t("Couldn’t create the template, try again?"));
        history.replace(settingsPath("templates"));
      }
    }

    void createTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Scene title={t("New template")}>
      <PlaceholderDocument />
    </Scene>
  );
}

export default observer(TemplateNewScene);
