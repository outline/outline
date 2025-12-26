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
import GoogleIcon from "~/components/Icons/GoogleIcon";
import Input from "~/components/Input";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { disconnectAnalyticsIntegrationFactory } from "~/actions/definitions/integrations";
import Flex from "~/components/Flex";
import styled from "styled-components";

type FormData = {
  measurementId: string;
};

function GoogleAnalytics() {
  const { integrations } = useStores();
  const { t } = useTranslation();

  const integration = find(integrations.orderedData, {
    type: IntegrationType.Analytics,
    service: IntegrationService.GoogleAnalytics,
  }) as Integration<IntegrationType.Analytics> | undefined;

  const measurementId = integration?.settings.measurementId;

  const {
    register,
    reset,
    handleSubmit: formHandleSubmit,
    formState,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      measurementId,
    },
  });

  React.useEffect(() => {
    reset({ measurementId });
  }, [reset, measurementId]);

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await integrations.save({
          id: integration?.id,
          type: IntegrationType.Analytics,
          service: IntegrationService.GoogleAnalytics,
          settings: {
            measurementId: data.measurementId,
          },
        });

        toast.success(t("Settings saved"));
      } catch (err) {
        toast.error(err.message);
      }
    },
    [integrations, integration, t]
  );

  return (
    <IntegrationScene title={t("Google Analytics")} icon={<GoogleIcon />}>
      <Heading>{t("Google Analytics")}</Heading>

      <Text as="p" type="secondary">
        <Trans>
          Add a Google Analytics 4 measurement ID to send document views and
          analytics from the workspace to your own Google Analytics account.
        </Trans>
      </Text>
      <form onSubmit={formHandleSubmit(handleSubmit)}>
        <SettingRow
          label={t("Measurement ID")}
          name="measurementId"
          description={t(
            'Create a "Web" stream in your Google Analytics admin dashboard and copy the measurement ID from the generated code snippet to install.'
          )}
          border={false}
        >
          <Input
            placeholder="G-XXXXXXXXX1"
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

export default observer(GoogleAnalytics);
