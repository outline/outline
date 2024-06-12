import find from "lodash/find";
import { observer } from "mobx-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import { IntegrationType, IntegrationService } from "@shared/types";
import Integration from "~/models/Integration";
import SettingRow from "~/scenes/Settings/components/SettingRow";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import Icon from "./Icon";

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

  const {
    register,
    reset,
    handleSubmit: formHandleSubmit,
    formState,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      instanceUrl: integration?.settings.instanceUrl,
      measurementId: integration?.settings.measurementId,
    },
  });

  React.useEffect(() => {
    void integrations.fetchPage({
      type: IntegrationType.Analytics,
    });
  }, [integrations]);

  React.useEffect(() => {
    reset({
      measurementId: integration?.settings.measurementId,
      instanceUrl: integration?.settings.instanceUrl,
    });
  }, [integration, reset]);

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        if (data.instanceUrl && data.measurementId) {
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
        } else {
          await integration?.delete();
        }

        toast.success(t("Settings saved"));
      } catch (err) {
        toast.error(err.message);
      }
    },
    [integrations, integration, t]
  );

  return (
    <Scene title="Matomo" icon={<Icon />}>
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
            required
            placeholder="https://instance.matomo.cloud/"
            {...register("instanceUrl")}
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
          <Input required placeholder="1" {...register("measurementId")} />
        </SettingRow>

        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? `${t("Saving")}…` : t("Save")}
        </Button>
      </form>
    </Scene>
  );
}

export default observer(Matomo);
