import { find } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { IntegrationService, IntegrationType } from "@shared/types";
import Integration from "~/models/Integration";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import Scene from "~/components/Scene";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import SlackIcon from "./Icon";
import SettingRow from "./components/SettingRow";

type FormData = {
  url: string;
  authToken: string;
};

function Iframely() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const { showToast } = useToasts();

  const integration = find(integrations.orderedData, {
    type: IntegrationType.Embed,
    service: IntegrationService.Iframely,
  }) as Integration<IntegrationType.Embed> | undefined;

  const {
    register,
    reset,
    handleSubmit: formHandleSubmit,
    formState,
  } = useForm<FormData>({
    mode: "all",

    defaultValues: {
      url: integration?.settings.url,
      authToken:
        integration && integration.authToken
          ? integration.authToken
          : undefined,
    },
  });

  React.useEffect(() => {
    integrations.fetchPage({
      type: IntegrationType.Embed,
    });
  }, [integrations]);

  React.useEffect(() => {
    reset({
      url: integration?.settings.url,
      authToken:
        integration && integration.authToken
          ? integration.authToken
          : undefined,
    });
  }, [integration, reset]);

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        if (data.url) {
          await integrations.save({
            id: integration?.id,
            type: IntegrationType.Embed,
            service: IntegrationService.Iframely,
            authToken: data.authToken ? data.authToken : null,
            settings: data.url
              ? {
                  url: data.url,
                }
              : undefined,
          });
        } else {
          await integration?.delete();
        }

        showToast(t("Settings saved"), {
          type: "success",
        });
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      }
    },
    [integrations, integration, t, showToast]
  );

  return (
    <Scene title={t("Iframely")} icon={<SlackIcon />}>
      <Heading>{t("Iframely")}</Heading>

      <form onSubmit={formHandleSubmit(handleSubmit)}>
        <SettingRow
          label={t("Iframely url")}
          name="iframelyUrl"
          description={t("Add your Iframely url here.")}
          border={false}
        >
          <Input
            placeholder="https://iframe.ly"
            pattern="https?://.*"
            {...register("url")}
          />
        </SettingRow>
        <SettingRow
          label={t("Iframely key")}
          name="key"
          description={t("Add your Iframely key here.")}
          border={false}
        >
          <Input placeholder="x-xxxx-xxxx-xxxx" {...register("authToken")} />
        </SettingRow>
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? `${t("Saving")}…` : t("Save")}
        </Button>
      </form>
    </Scene>
  );
}

export default observer(Iframely);
