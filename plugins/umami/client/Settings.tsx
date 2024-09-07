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
  umamiDomain: string;
  umamiScriptName: string;
  umamiWebsiteId: string;
};

function Umami() {
  const { integrations } = useStores();
  const { t } = useTranslation();

  const integration = find(integrations.orderedData, {
    type: IntegrationType.Analytics,
    service: IntegrationService.Umami,
  }) as Integration<IntegrationType.Analytics> | undefined;

  const {
    register,
    reset,
    handleSubmit: formHandleSubmit,
    formState,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      umamiDomain: integration?.settings.instanceUrl,
      umamiScriptName: integration?.settings.scriptName,
      umamiWebsiteId: integration?.settings.measurementId,
    },
  });

  React.useEffect(() => {
    void integrations.fetchPage({
      type: IntegrationType.Analytics,
    });
  }, [integrations]);

  React.useEffect(() => {
    reset({
      umamiWebsiteId: integration?.settings.measurementId,
      umamiDomain: integration?.settings.instanceUrl,
      umamiScriptName: integration?.settings.scriptName,
    });
  }, [integration, reset]);

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        if (data.umamiDomain && data.umamiScriptName && data.umamiWebsiteId) {
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
    <Scene title="Umami" icon={<Icon />}>
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
            required
            placeholder="https://cloud.umami.is/"
            {...register("umamiDomain")}
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
            required
            placeholder="script.js"
            {...register("umamiScriptName")}
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
            required
            placeholder="xxx-xxx-xxx-xxx"
            {...register("umamiWebsiteId")}
          />
        </SettingRow>

        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? `${t("Saving")}…` : t("Save")}
        </Button>
      </form>
    </Scene>
  );
}

export default observer(Umami);
