import { observer } from "mobx-react";
import { ShapesIcon } from "outline-icons";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import Template from "~/models/Template";
import { Action } from "~/components/Actions";
import Breadcrumb from "~/components/Breadcrumb";
import Button from "~/components/Button";
import CollectionIcon from "~/components/Icons/NotebookIcon";
import Scene from "~/components/Scene";
import { TemplateForm } from "~/components/Template/TemplateForm";
import { createInternalLinkAction } from "~/actions";
import { NavigationSection } from "~/actions/sections";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { notebookPath, settingsPath } from "~/utils/routeHelpers";
import history from "~/utils/history";
function TemplateNewScene() {
  const { t } = useTranslation();
  const { templates, notebooks } = useStores();
  const params = useQuery();
  const notebookId = params.get("collectionId") || undefined;
  const notebook = notebookId ? notebooks.get(notebookId) : undefined;
  const [template] = useState(
    () => new Template({ title: "", notebookId }, templates)
  );
  const [saving, setSaving] = useState(false);
  const breadcrumbActions = useMemo(
    () => [
      createInternalLinkAction({
        name: t("Templates"),
        section: NavigationSection,
        icon: <ShapesIcon />,
        to: settingsPath("templates"),
      }),
      ...(notebook
        ? [
            createInternalLinkAction({
              name: notebook.name,
              section: NavigationSection,
              icon: <CollectionIcon notebook={notebook} />,
              to: notebookPath(notebook),
            }),
          ]
        : []),
    ],
    [t, notebook]
  );
  const handleSubmit = useCallback(async () => {
    if (!template.data || ProsemirrorDataHelper.isEmpty(template.data)) {
      toast.message(t("A template must have content"));
      return;
    }
    setSaving(true);
    try {
      await template.save();
      history.push(settingsPath("templates"));
    } catch (error) {
      toast.error(errToString(error));
    } finally {
      setSaving(false);
    }
  }, [template, t]);
  return (
    <Scene
      title={t("New template")}
      left={<Breadcrumb actions={breadcrumbActions} />}
      actions={
        <Action>
          <Button onClick={handleSubmit} disabled={saving}>
            {t("Save")}
          </Button>
        </Action>
      }
    >
      <TemplateForm template={template} handleSubmit={handleSubmit} />
    </Scene>
  );
}
export default observer(TemplateNewScene);
