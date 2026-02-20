import { observer } from "mobx-react";
import { ShapesIcon } from "outline-icons";
import { useEffect, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { Action } from "~/components/Actions";
import Breadcrumb from "~/components/Breadcrumb";
import Button from "~/components/Button";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import LoadingIndicator from "~/components/LoadingIndicator";
import Scene from "~/components/Scene";
import { TemplateForm } from "~/components/Template/TemplateForm";
import { createInternalLinkAction } from "~/actions";
import { NavigationSection } from "~/actions/sections";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import TemplateMenu from "~/menus/TemplateMenu";
import { collectionPath, settingsPath } from "~/utils/routeHelpers";
import type Template from "~/models/Template";
import history from "~/utils/history";

type Props = {
  template: Template;
};

const LoadingState = observer(function LoadingState() {
  const { id } = useParams<{ id: string }>();
  const { templates, ui } = useStores();
  const template = templates.get(id);
  const { request } = useRequest(() => templates.fetch(id));

  useEffect(() => {
    if (!template) {
      void request();
    }
  }, [template, request]);

  useEffect(() => {
    if (template) {
      ui.addActiveModel(template);
    }
    return () => {
      template && ui.removeActiveModel(template);
    };
  }, [template, ui]);

  if (!template) {
    return <LoadingIndicator />;
  }

  return <TemplateSetting template={template} />;
});

const TemplateSetting = observer(function Template_({ template }: Props) {
  const { t } = useTranslation();
  const { collections } = useStores();
  const [saving, setSaving] = useState(false);
  const collection = template.collectionId
    ? collections.get(template.collectionId)
    : undefined;

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
      title={template.title}
      left={<Breadcrumb actions={breadcrumbActions} />}
      actions={
        <>
          <Action>
            <Button onClick={handleSubmit} disabled={saving}>
              {t("Save")}
            </Button>
          </Action>
          <Action>
            <TemplateMenu template={template} />
          </Action>
        </>
      }
    >
      <TemplateForm template={template} handleSubmit={handleSubmit} />
    </Scene>
  );
});

export default LoadingState;
