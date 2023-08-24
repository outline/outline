import find from "lodash/find";
import { observer } from "mobx-react";
import { BuildingBlocksIcon } from "outline-icons";
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
import SettingRow from "./components/SettingRow";

type FormData = {
  drawIoUrl: string;
  krokiIoUrl: string;
  gristUrl: string;
};

function SelfHosted() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const { showToast } = useToasts();

  const integrationDiagrams = find(integrations.orderedData, {
    type: IntegrationType.Embed,
    service: IntegrationService.Diagrams,
  }) as Integration<IntegrationType.Embed> | undefined;

  const integrationKroki = find(integrations.orderedData, {
    type: IntegrationType.Embed,
    service: IntegrationService.Kroki,
  }) as Integration<IntegrationType.Embed> | undefined;

  const integrationGrist = find(integrations.orderedData, {
    type: IntegrationType.Embed,
    service: IntegrationService.Grist,
  }) as Integration<IntegrationType.Embed> | undefined;

  const {
    register,
    reset,
    handleSubmit: formHandleSubmit,
    formState,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      drawIoUrl: integrationDiagrams?.settings.url,
      gristUrl: integrationGrist?.settings.url,
      krokiIoUrl: integrationKroki?.settings.url,
    },
  });

  React.useEffect(() => {
    void integrations.fetchPage({
      type: IntegrationType.Embed,
    });
  }, [integrations]);

  React.useEffect(() => {
    reset({
      drawIoUrl: integrationDiagrams?.settings.url,
      gristUrl: integrationGrist?.settings.url,
      krokiIoUrl: integrationKroki?.settings.url,
    });
  }, [integrationDiagrams, integrationGrist, integrationKroki, reset]);

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        if (data.drawIoUrl) {
          await integrations.save({
            id: integrationDiagrams?.id,
            type: IntegrationType.Embed,
            service: IntegrationService.Diagrams,
            settings: {
              url: data.drawIoUrl,
            },
          });
        } else {
          await integrationDiagrams?.delete();
        }

        if (data.gristUrl) {
          await integrations.save({
            id: integrationGrist?.id,
            type: IntegrationType.Embed,
            service: IntegrationService.Grist,
            settings: {
              url: data.gristUrl,
            },
          });
        } else {
          await integrationGrist?.delete();
        }

        if (data.krokiIoUrl) {
          await integrations.save({
            id: integrationKroki?.id,
            type: IntegrationType.Embed,
            service: IntegrationService.Kroki,
            settings: {
              url: data.krokiIoUrl,
            },
          });
        } else {
          await integrationKroki?.delete();
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
    [
      integrations,
      integrationDiagrams,
      integrationGrist,
      integrationKroki,
      t,
      showToast,
    ]
  );

  return (
    <Scene title={t("Self Hosted")} icon={<BuildingBlocksIcon />}>
      <Heading>{t("Self Hosted")}</Heading>

      <form onSubmit={formHandleSubmit(handleSubmit)}>
        <SettingRow
          label={t("Draw.io deployment")}
          name="drawIoUrl"
          description={t(
            "Add your self-hosted draw.io installation url here to enable automatic embedding of diagrams within documents."
          )}
          border={false}
        >
          <Input
            placeholder="https://app.diagrams.net/"
            pattern="https?://.*"
            {...register("drawIoUrl")}
          />
        </SettingRow>

        <SettingRow
          label={t("Kroki.io deployment")}
          name="krokiIoUrl"
          description={t(
            "Add your self-hosted kroki.io installation url here to enable automatic embedding of diagrams from textual descriptions."
          )}
          border={false}
        >
          <Input
            placeholder="https://app.kroki.io/"
            pattern="https?://.*"
            {...register("krokiIoUrl")}
          />
        </SettingRow>

        <SettingRow
          label={t("Grist deployment")}
          name="gristUrl"
          description={t("Add your self-hosted grist installation URL here.")}
          border={false}
        >
          <Input
            placeholder="https://docs.getgrist.com/"
            pattern="https?://.*"
            {...register("gristUrl")}
          />
        </SettingRow>

        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? `${t("Saving")}…` : t("Save")}
        </Button>
      </form>
    </Scene>
  );
}

export default observer(SelfHosted);
