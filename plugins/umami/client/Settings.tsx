import find from "lodash/find";
import { observer } from "mobx-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import { IntegrationType, IntegrationService } from "@shared/types";
import Integration from "~/models/Integration";
import { IntegrationScene } from "~/scenes/Settings/components/IntegrationScene";
import SettingRow from "~/scenes/Settings/components/SettingRow";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import Icon from "./Icon";
import Flex from "~/components/Flex";
import { disconnectAnalyticsIntegrationFactory } from "~/actions/definitions/integrations";
import useActionContext from "~/hooks/useActionContext";
import styled from "styled-components";

type FormData = {
  umamiDomain: string;
  umamiScriptName: string;
  umamiWebsiteId: string;
};

function Umami() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const context = useActionContext();

  const integration = find(integrations.orderedData, {
    type: IntegrationType.Analytics,
    service: IntegrationService.Umami,
  }) as Integration<IntegrationType.Analytics> | undefined;

  const instanceUrl = integration?.settings.instanceUrl;
  const scriptName = integration?.settings.scriptName;
  const measurementId = integration?.settings.measurementId;

  const {
    register,
    reset,
    handleSubmit: formHandleSubmit,
    formState,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      umamiDomain: instanceUrl,
      umamiScriptName: scriptName,
      umamiWebsiteId: measurementId,
    },
  });

  React.useEffect(() => {
    reset({
      umamiDomain: instanceUrl,
      umamiScriptName: scriptName,
      umamiWebsiteId: measurementId,
    });
  }, [reset, instanceUrl, scriptName, measurementId]);

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await integrations.save({
          id: integration?.id,
          type: IntegrationType.Analytics,
          service: IntegrationService.Umami,
          settings: {
            measurementId: data.umamiWebsiteId,
            instanceUrl: data.umamiDomain.replace(/\/?$/, "/"),
            scriptName: data.umamiScriptName,
          } as Integration<IntegrationType.Analytics>["settings"],
        });

        toast.success(t("Settings saved"));
      } catch (err) {
        toast.error(err.message);
      }
    },
    [integrations, integration, t]
  );

  return (
    <IntegrationScene title="Umami" icon={<Icon />}>
      <Heading>Umami</Heading>

      <Text as="p" type="secondary">
        <Trans>
          Configure a Umami installation to send views and analytics from the
          workspace to your own Umami instance.
        </Trans>
      </Text>
      <form onSubmit={formHandleSubmit(handleSubmit)}>
        <SettingRow
          label={t("Instance URL")}
          name="umamiDomain"
          description={t(
            "The URL of your Umami instance. If you are using Umami Cloud it will begin with {{ url }}",
            {
              url: "https://cloud.umami.is/",
            }
          )}
          border={false}
        >
          <Input
            placeholder="https://cloud.umami.is/"
            {...register("umamiDomain", { required: true })}
          />
        </SettingRow>
        <SettingRow
          label={t("Script name")}
          name="umamiScriptName"
          description={t(
            "The name of the script file that Umami uses to track analytics."
          )}
          border={false}
        >
          <Input
            placeholder="script.js"
            {...register("umamiScriptName", { required: true })}
          />
        </SettingRow>
        <SettingRow
          label={t("Site ID")}
          name="umamiWebsiteId"
          description={t(
            "An ID that uniquely identifies the website in your Umami instance."
          )}
          border={false}
        >
          <Input
            placeholder="xxx-xxx-xxx-xxx"
            {...register("umamiWebsiteId", { required: true })}
          />
        </SettingRow>

        <Actions reverse justify="end" gap={8}>
          <StyledSubmit
            type="submit"
            disabled={
              !formState.isDirty || !formState.isValid || formState.isSubmitting
            }
          >
            {formState.isSubmitting ? `${t("Saving")}…` : t("Save")}
          </StyledSubmit>

          <Button
            action={disconnectAnalyticsIntegrationFactory(integration)}
            context={context}
            disabled={formState.isSubmitting}
            neutral
            hideIcon
            hideOnActionDisabled
          >
            {t("Disconnect")}
          </Button>
        </Actions>
      </form>
    </IntegrationScene>
  );
}

const Actions = styled(Flex)`
  margin-top: 8px;
`;

const StyledSubmit = styled(Button)`
  width: 80px;
`;

export default observer(Umami);
