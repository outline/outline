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
import Flex from "~/components/Flex";
import styled from "styled-components";
import useStores from "~/hooks/useStores";
import { disconnectIntegrationFactory } from "~/actions/definitions/integrations";
import Icon from "./Icon";

type FormData = {
  url: string;
};

function Grist() {
  const { integrations } = useStores();
  const { t } = useTranslation();

  const integration = find(integrations.orderedData, {
    type: IntegrationType.Embed,
    service: IntegrationService.Grist,
  }) as Integration<IntegrationType.Embed> | undefined;

  const url = integration?.settings.url;

  const {
    register,
    reset,
    handleSubmit: formHandleSubmit,
    formState,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      url,
    },
  });

  React.useEffect(() => {
    reset({
      url,
    });
  }, [reset, url]);

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await integrations.save({
          id: integration?.id,
          type: IntegrationType.Embed,
          service: IntegrationService.Grist,
          settings: {
            url: data.url,
          } as Integration<IntegrationType.Embed>["settings"],
        });

        toast.success(t("Settings saved"));
      } catch (err) {
        toast.error(err.message);
      }
    },
    [integrations, integration, t]
  );

  return (
    <IntegrationScene title="Grist" icon={<Icon />}>
      <Heading>Grist</Heading>

      <Text as="p" type="secondary">
        <Trans>
          Configure a custom Grist installation URL to use your own self-hosted
          instance for embedding spreadsheets in your documents.
        </Trans>
      </Text>
      <form onSubmit={formHandleSubmit(handleSubmit)}>
        <SettingRow
          label={t("Installation URL")}
          name="url"
          description={t(
            "The URL of your Grist installation. Leave empty to use the cloud hosted getgrist.com"
          )}
          border={false}
        >
          <Input
            placeholder="https://grist.example.com"
            {...register("url", { required: false })}
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
            action={disconnectIntegrationFactory(integration)}
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

export default observer(Grist);
