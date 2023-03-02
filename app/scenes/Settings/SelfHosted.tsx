import { find } from "lodash";
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
  castopodUrl: string;
};

function SelfHosted() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const { showToast } = useToasts();

  const integrationDiagrams = find(integrations.orderedData, {
    type: IntegrationType.Embed,
    service: IntegrationService.Diagrams,
  }) as Integration<IntegrationType.Embed> | undefined;

  const integrationCastopod = find(integrations.orderedData, {
    type: IntegrationType.Embed,
    service: IntegrationService.Castopod,
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
      castopodUrl: integrationCastopod?.settings.url,
    },
  });

  React.useEffect(() => {
    integrations.fetchPage({
      type: IntegrationType.Embed,
    });
  }, [integrations]);

  React.useEffect(() => {
    reset({ drawIoUrl: integrationDiagrams?.settings.url });
    reset({ castopodUrl: integrationCastopod?.settings.url });
  }, [integrationDiagrams, integrationCastopod, reset]);

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        if (data.drawIoUrl || data.castopodUrl) {
          if (data.castopodUrl) {
            await integrations.save({
              id: integrationCastopod?.id,
              type: IntegrationType.Embed,
              service: IntegrationService.Castopod,
              settings: {
                url: data.castopodUrl,
              },
            });
          } else {
            await integrationCastopod?.delete();
          }
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
        } else {
          await integrationCastopod?.delete();
          await integrationDiagrams?.delete();
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
    [integrations, integrationDiagrams, integrationCastopod, t, showToast]
  );

  return (
    <Scene
      title={t("Self Hosted")}
      icon={<BuildingBlocksIcon color="currentColor" />}
    >
      <Heading>{t("Self Hosted")}</Heading>

      <form onSubmit={formHandleSubmit(handleSubmit)}>
        <SettingRow
          label={t("Castopod deployment")}
          name="castopodUrl"
          description={t(
            "Add your self-hosted castopod installation url here to enable automatic embedding of podcasts within documents."
          )}
          border={false}
        >
          <Input
            placeholder="https://castopod.org/"
            pattern="https?://.*"
            {...register("castopodUrl")}
          />
        </SettingRow>
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
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? `${t("Saving")}…` : t("Save")}
        </Button>
      </form>
    </Scene>
  );
}

export default observer(SelfHosted);
