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

type FormData = {
  url: string;
};

function Diagrams() {
  const { integrations } = useStores();
  const { t } = useTranslation();

  React.useEffect(() => {
    integrations.fetchPage({
      limit: 100,
    });
  }, [integrations]);

  const integration = find(
    integrations.orderedData,
    (i) => i.service === "diagrams"
  ) as Integration<IntegrationType.Embed> | undefined;

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
      if (integration) {
        await integration.save({
          settings: {
            url: data.url,
          },
        });
      } else {
        await integrations.create({
          type: IntegrationType.Embed,
          service: "diagrams",
          settings: {
            url: data.url,
          },
        });
      }
    },
    [integrations, integration]
  );

  return (
    <Scene
      title={t("Draw.io")}
      icon={<BuildingBlocksIcon color="currentColor" />}
    >
      <Heading>{t("Draw.io")}</Heading>

      <Text type="secondary">
        <Trans>
          If your team is self-hosting draw.io then adding your hosted
          deployment url here will enable automatic embedding within documents.
          If you are using Diagrams.net then no configuration is required.
        </Trans>
        <form onSubmit={formHandleSubmit(handleSubmit)}>
          <p>
            <Input
              label={t("Draw.io Deployment")}
              placeholder={"https://app.diagrams.net/"}
              pattern="https://.*"
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

export default observer(Diagrams);
