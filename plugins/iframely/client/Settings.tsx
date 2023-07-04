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
import LoadingIndicator from "~/components/LoadingIndicator";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import IframelyIcon from "./Icon";
import SettingRow from "./components/SettingRow";

type FormData = {
  baseUrl: string;
  apiKey: string;
};

function Iframely() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const [disconnecting, setDisconnecting] = React.useState<boolean>(false);

  const { loading, loaded, request } = useRequest(() =>
    integrations.fetchPage({
      type: IntegrationType.Embed,
    })
  );

  React.useEffect(() => {
    if (!loaded && !loading) {
      void request();
    }
  }, [loaded, loading, request]);

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
  });

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        if (data.baseUrl) {
          await integrations.create({
            type: IntegrationType.Embed,
            service: IntegrationService.Iframely,
            authToken: data.apiKey ? data.apiKey : null,
            settings: data.baseUrl
              ? {
                  url: data.baseUrl,
                }
              : undefined,
          });
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

  const disconnect = React.useCallback(async () => {
    setDisconnecting(true);
    try {
      await integration?.delete();
      showToast(t("Integration disconnected"), {
        type: "success",
      });
      reset();
    } catch (err) {
      showToast(err.message, {
        type: "error",
      });
    } finally {
      setDisconnecting(false);
    }
  }, [integration]);

  if (!loaded) {
    return null;
  }

  return loading ? (
    <LoadingIndicator />
  ) : (
    <Scene title={t("Iframely")} icon={<IframelyIcon />}>
      <Heading>{t("Iframely")}</Heading>
      <Text type="secondary">
        {t("Get rich previews of links in documents")}
      </Text>
      {!integration ? (
        <form onSubmit={formHandleSubmit(handleSubmit)}>
          <SettingRow
            label={t("Deployment url")}
            name="url"
            description={t(
              "Optionally add your self-hosted Iframely installation url here or leave blank to use the cloud hosted Iframely."
            )}
            border={false}
          >
            <Input
              placeholder="https://iframe.ly"
              pattern="https?://.*"
              {...register("baseUrl")}
            />
          </SettingRow>
          <SettingRow
            label={t("API key")}
            name="key"
            description={t(
              "Add your Iframely API key to enable previewing of links."
            )}
            border={false}
          >
            <Input {...register("apiKey")} />
          </SettingRow>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? `${t("Saving")}…` : t("Save")}
          </Button>
        </form>
      ) : (
        <Button onClick={disconnect} disabled={disconnecting}>
          {disconnecting ? `${t("Disconnecting")}…` : t("Disconnect")}
        </Button>
      )}
    </Scene>
  );
}

export default observer(Iframely);
