import { find } from "lodash";
import { observer } from "mobx-react";
import { BuildingBlocksIcon } from "outline-icons";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import Integration from "~/models/Integration";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import { ReactHookWrappedInput as Input } from "~/components/Input";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";

type FormData = {
  hostname: string;
};

function Diagrams() {
  const user = useCurrentUser();
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
  ) as Integration<{ hostname: string }> | undefined;

  const { register, handleSubmit: formHandleSubmit, formState } = useForm<
    FormData
  >({
    mode: "all",
    defaultValues: {
      hostname: integration?.settings.hostname,
    },
  });

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      console.log(data);
      if (integration) {
        await integration.save({
          settings: {
            hostname: data.hostname,
          },
        });
      } else {
        await integrations.create({
          service: "diagrams",
          settings: {
            hostname: data.hostname,
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
              {...register("hostname", {
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
