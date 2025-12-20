import find from "lodash/find";
import { observer } from "mobx-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import { IntegrationType, IntegrationService } from "@shared/types";
import type Integration from "~/models/Integration";
import { IntegrationScene } from "~/scenes/Settings/components/IntegrationScene";
import SettingRow from "~/scenes/Settings/components/SettingRow";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import Icon from "./Icon";
import { disconnectAnalyticsIntegrationFactory } from "~/actions/definitions/integrations";
import Flex from "~/components/Flex";
import styled from "styled-components";

type FormData = {
  instanceUrl: string;
  measurementId: string;
};

function Matomo() {
  const { integrations } = useStores();
  const { t } = useTranslation();

  const integration = find(integrations.orderedData, {
    type: IntegrationType.Analytics,
    service: IntegrationService.Matomo,
  }) as Integration<IntegrationType.Analytics> | undefined;

  const instanceUrl = integration?.settings.instanceUrl;
  const measurementId = integration?.settings.measurementId;

  const {
    register,
    reset,
    handleSubmit: formHandleSubmit,
    formState,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      instanceUrl,
      measurementId,
    },
  });

  React.useEffect(() => {
    reset({
      instanceUrl,
      measurementId,
    });
  }, [reset, instanceUrl, measurementId]);

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await integrations.save({
          id: integration?.id,
          type: IntegrationType.Analytics,
          service: IntegrationService.Matomo,
          settings: {
            measurementId: data.measurementId,
            // Ensure the URL ends with a trailing slash
            instanceUrl: data.instanceUrl.replace(/\/?$/, "/"),
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
    <IntegrationScene title="Matomo" icon={<Icon />}>
      <Heading>Matomo</Heading>

      <Text as="p" type="secondary">
        <Trans>
          Configure a Matomo installation to send views and analytics from the
          workspace to your own Matomo instance.
        </Trans>
      </Text>
      <form onSubmit={formHandleSubmit(handleSubmit)}>
        <SettingRow
          label={t("Instance URL")}
          name="instanceUrl"
          description={t(
            "The URL of your Matomo instance. If you are using Matomo Cloud it will end in matomo.cloud/"
          )}
          border={false}
        >
          <Input
            placeholder="https://instance.matomo.cloud/"
            {...register("instanceUrl", { required: true })}
          />
        </SettingRow>
        <SettingRow
          label={t("Site ID")}
          name="measurementId"
          description={t(
            "An ID that uniquely identifies the website in your Matomo instance."
          )}
          border={false}
        >
          <Input
            placeholder="1"
            {...register("measurementId", { required: true })}
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

export default observer(Matomo);
