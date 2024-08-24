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
import GoogleIcon from "~/components/Icons/GoogleIcon";
import Input from "~/components/Input";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";

type FormData = {
  measurementId: string;
};

function GoogleAnalytics() {
  const { integrations } = useStores();
  const { t } = useTranslation();

  const integration = find(integrations.orderedData, {
    type: IntegrationType.Analytics,
    service: IntegrationService.GoogleAnalytics,
  }) as Integration<IntegrationType.Analytics> | undefined;

  const {
    register,
    reset,
    handleSubmit: formHandleSubmit,
    formState,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      measurementId: integration?.settings.measurementId,
    },
  });

  React.useEffect(() => {
    void integrations.fetchPage({
      type: IntegrationType.Analytics,
    });
  }, [integrations]);

  React.useEffect(() => {
    reset({ measurementId: integration?.settings.measurementId });
  }, [integration, reset]);

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        if (data.measurementId) {
          await integrations.save({
            id: integration?.id,
            type: IntegrationType.Analytics,
            service: IntegrationService.GoogleAnalytics,
            settings: {
              measurementId: data.measurementId,
            },
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
    <Scene title={t("Google Analytics")} icon={<GoogleIcon />}>
      <Heading>{t("Google Analytics")}</Heading>

      <Text as="p" type="secondary">
        <Trans>
          Add a Google Analytics 4 measurement ID to send document views and
          analytics from the workspace to your own Google Analytics account.
        </Trans>
      </Text>
      <form onSubmit={formHandleSubmit(handleSubmit)}>
        <SettingRow
          label={t("Measurement ID")}
          name="measurementId"
          description={t(
            'Create a "Web" stream in your Google Analytics admin dashboard and copy the measurement ID from the generated code snippet to install.'
          )}
          border={false}
        >
          <Input placeholder="G-XXXXXXXXX1" {...register("measurementId")} />
        </SettingRow>

        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? `${t("Saving")}…` : t("Save")}
        </Button>
      </form>
    </Scene>
  );
}

export default observer(GoogleAnalytics);
