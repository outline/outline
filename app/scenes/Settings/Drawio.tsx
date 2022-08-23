import { head } from "lodash";
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
  url: string;
};

const SERVICE_NAME = "diagrams";

function Drawio() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const { showToast } = useToasts();

  React.useEffect(() => {
    integrations.fetchPage({
      service: SERVICE_NAME,
      type: IntegrationType.Embed,
    });
  }, [integrations]);

  const integration = head(integrations.orderedData) as
    | Integration<IntegrationType.Embed>
    | undefined;

  const { register, handleSubmit: formHandleSubmit, formState } = useForm<
    FormData
  >({
    mode: "all",
    defaultValues: {
      url: integration?.settings.url,
    },
  });

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await integrations.save({
          id: integration?.id,
          type: IntegrationType.Embed,
          service: SERVICE_NAME,
          settings: {
            url: data.url,
          },
        });

        showToast("Settings saved", {
          type: "success",
        });
      } catch (err) {
        showToast("Failed to save!", {
          type: "error",
        });
      }
    },
    [integrations, integration, showToast]
  );

  return (
    <Scene title="Draw.io" icon={<BuildingBlocksIcon color="currentColor" />}>
      <Heading>Draw.io</Heading>

      <Text type="secondary">
        <Trans>
          Add your self-hosted draw.io installation url here to enable automatic
          embedding of diagrams within documents.
        </Trans>
        <form onSubmit={formHandleSubmit(handleSubmit)}>
          <p>
            <Input
              label={t("Draw.io deployment")}
              placeholder={"https://app.diagrams.net/"}
              pattern="https?://.*"
              {...register("url", {
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

export default observer(Drawio);
