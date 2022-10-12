import { find } from "lodash";
import { observer } from "mobx-react";
import { BuildingBlocksIcon } from "outline-icons";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import { IntegrationType } from "@shared/types";
import Integration from "~/models/Integration";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import { ReactHookWrappedInput as Input } from "~/components/Input";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type FormData = {
  drawIoUrl: string;
};

function SelfHosted() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const { showToast } = useToasts();

  const integration = find(integrations.orderedData, {
    type: IntegrationType.Embed,
    service: "diagrams",
  }) as Integration<IntegrationType.Embed> | undefined;

  const {
    register,
    reset,
    handleSubmit: formHandleSubmit,
    formState,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      drawIoUrl: integration?.settings.url,
    },
  });

  React.useEffect(() => {
    integrations.fetchPage({
      type: IntegrationType.Embed,
    });
  }, [integrations]);

  React.useEffect(() => {
    reset({ drawIoUrl: integration?.settings.url });
  }, [integration, reset]);

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await integrations.save({
          id: integration?.id,
          type: IntegrationType.Embed,
          service: "diagrams",
          settings: {
            url: data.drawIoUrl,
          },
        });

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
    <Scene
      title={t("Self Hosted")}
      icon={<BuildingBlocksIcon color="currentColor" />}
    >
      <Heading>{t("Self Hosted")}</Heading>

      <Text type="secondary">
        <Trans>
          Add your self-hosted draw.io installation url here to enable automatic
          embedding of diagrams within documents.
        </Trans>
        <form onSubmit={formHandleSubmit(handleSubmit)}>
          <p>
            <Input
              label={t("Draw.io deployment")}
              placeholder="https://app.diagrams.net/"
              pattern="https?://.*"
              {...register("drawIoUrl", {
                required: true,
              })}
            />
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? `${t("Saving")}…` : t("Save")}
            </Button>
          </p>
        </form>
      </Text>
    </Scene>
  );
}

export default observer(SelfHosted);
