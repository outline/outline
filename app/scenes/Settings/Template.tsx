import { observer } from "mobx-react";
import { ShapesIcon } from "outline-icons";
import { useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import Breadcrumb from "~/components/Breadcrumb";
import LoadingIndicator from "~/components/LoadingIndicator";
import Scene from "~/components/Scene";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { settingsPath } from "~/utils/routeHelpers";
import { createInternalLinkAction } from "~/actions";
import { NavigationSection } from "~/actions/sections";
import type Template from "~/models/Template";
import TemplateMenu from "~/menus/TemplateMenu";
import { TemplateNew } from "~/components/Template/TemplateNew";
import history from "~/utils/history";
import { TemplateEdit } from "~/components/Template/TemplateEdit";

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
      ui.setActiveTemplate(template);
    }
    return () => {
      ui.clearActiveDocument();
    };
  }, [template, ui]);

  if (!template) {
    return <LoadingIndicator />;
  }

  return <TemplateSetting template={template} />;
});

const TemplateSetting = observer(function Template_({ template }: Props) {
  const { t } = useTranslation();

  const breadcrumbActions = useMemo(
    () => [
      createInternalLinkAction({
        name: t("Templates"),
        section: NavigationSection,
        icon: <ShapesIcon />,
        to: settingsPath("templates"),
      }),
    ],
    [t]
  );

  const handleSave = useCallback(() => {
    history.push(settingsPath("templates"));
  }, []);

  return (
    <Scene
      title={template.title}
      left={<Breadcrumb actions={breadcrumbActions} />}
      actions={<TemplateMenu template={template} />}
    >
      {template ? (
        <TemplateEdit template={template} onSubmit={handleSave} />
      ) : (
        <TemplateNew onSubmit={handleSave} />
      )}
    </Scene>
  );
});

export default LoadingState;
