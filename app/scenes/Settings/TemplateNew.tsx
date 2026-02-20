import { observer } from "mobx-react";
import { ShapesIcon } from "outline-icons";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import Template from "~/models/Template";
import { Action } from "~/components/Actions";
import Breadcrumb from "~/components/Breadcrumb";
import Button from "~/components/Button";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import Scene from "~/components/Scene";
import { TemplateForm } from "~/components/Template/TemplateForm";
import { createInternalLinkAction } from "~/actions";
import { NavigationSection } from "~/actions/sections";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { collectionPath, settingsPath } from "~/utils/routeHelpers";
import history from "~/utils/history";

function TemplateNewScene() {
  const { t } = useTranslation();
  const { templates, collections } = useStores();
  const params = useQuery();
  const collectionId = params.get("collectionId") || undefined;
  const collection = collectionId ? collections.get(collectionId) : undefined;

  const [template] = useState(
    () => new Template({ title: "", collectionId }, templates)
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
      ...(collection
        ? [
            createInternalLinkAction({
              name: collection.name,
              section: NavigationSection,
              icon: <CollectionIcon collection={collection} />,
              to: collectionPath(collection),
            }),
          ]
        : []),
    ],
    [t, collection]
  );

  const handleSubmit = useCallback(async () => {
    if (!template.data || ProsemirrorHelper.isEmptyData(template.data)) {
      toast.message(t("A template must have content"));
      return;
    }

    setSaving(true);
    try {
      await template.save();
      history.push(settingsPath("templates"));
    } catch (error) {
      toast.error(error.message);
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
