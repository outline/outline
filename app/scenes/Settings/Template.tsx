import { observer } from "mobx-react";
import { CopyIcon, InternetIcon, ReplaceIcon, ShapesIcon } from "outline-icons";
import { useEffect, useCallback, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { OAuthClientValidation } from "@shared/validations";
import OAuthClient from "~/models/oauth/OAuthClient";
import Breadcrumb from "~/components/Breadcrumb";
import Button from "~/components/Button";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import ContentEditable from "~/components/ContentEditable";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import LoadingIndicator from "~/components/LoadingIndicator";
import NudeButton from "~/components/NudeButton";
import { FormData } from "~/components/OAuthClient/OAuthClientForm";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Tooltip from "~/components/Tooltip";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import OAuthClientMenu from "~/menus/OAuthClientMenu";
import isCloudHosted from "~/utils/isCloudHosted";
import { settingsPath } from "~/utils/routeHelpers";
import { ActionRow } from "./components/ActionRow";
import { CopyButton } from "./components/CopyButton";
import ImageInput from "./components/ImageInput";
import SettingRow from "./components/SettingRow";
import { createInternalLinkActionV2 } from "~/actions";
import { NavigationSection } from "~/actions/sections";
import Template from "~/models/Template";
import TemplateMenu from "~/menus/TemplateMenu";
import { TemplateForm } from "~/components/Template/TemplateForm";
import { TemplateNew } from "~/components/Template/TemplateNew";
import history from "~/utils/history";
import { TemplateEdit } from "~/components/Template/TemplateEdit";

type Props = {
  template: Template;
};

const LoadingState = observer(function LoadingState() {
  const { id } = useParams<{ id: string }>();
  const { templates } = useStores();
  const template = templates.get(id);
  const { request } = useRequest(() => templates.fetch(id));

  useEffect(() => {
    if (!template) {
      void request();
    }
  }, [template]);

  if (!template) {
    return <LoadingIndicator />;
  }

  return <TemplateSetting template={template} />;
});

const TemplateSetting = observer(function Template_({ template }: Props) {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  const breadcrumbActions = useMemo(
    () => [
      createInternalLinkActionV2({
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
      {template ? <TemplateEdit template={template} onSubmit={handleSave} /> : <TemplateNew onSubmit={handleSave} />}
    </Scene>
  );
});

export default LoadingState;
