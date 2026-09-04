import { find } from "es-toolkit/compat";
import { observer } from "mobx-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { errToString } from "@shared/utils/error";
import { IntegrationType, IntegrationService } from "@shared/types";
import type Integration from "~/models/Integration";
import { IntegrationScene } from "~/scenes/Settings/components/IntegrationScene";
import SettingRow from "~/scenes/Settings/components/SettingRow";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import Flex from "~/components/Flex";
import useStores from "~/hooks/useStores";
import { disconnectIntegrationFactory } from "~/actions/definitions/integrations";
import Icon from "./Icon";

interface FormData {
  url: string;
  mermaid: boolean;
}

/**
 * Fetch the list of supported diagram formats from a Kroki server.
 *
 * @param url - the Kroki server URL.
 * @returns array of supported format names.
 */
async function fetchSupportedFormats(url: string): Promise<string[]> {
  const trimmedUrl = url.trim().replace(/\/$/, "");
  const response = await fetch(`${trimmedUrl}/health`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();

  if (data.output && typeof data.output === "object") {
    return Object.keys(data.output).filter(
      (key) => data.output[key].status === "pass"
    );
  }
  if (data.version && typeof data.version === "object") {
    return Object.keys(data.version).filter((key) => key !== "kroki");
  }
  return [];
}

function Kroki() {
  const { integrations } = useStores();
  const { t } = useTranslation();

  const integration = find(integrations.orderedData, {
    type: IntegrationType.Embed,
    service: IntegrationService.Kroki,
  }) as Integration<IntegrationType.Embed> | undefined;

  const savedSettings = integration?.settings.kroki as
    | { url?: string; mermaid?: boolean; enabledFormats?: string[] }
    | undefined;
  const savedUrl = savedSettings?.url ?? "";
  const savedMermaid = savedSettings?.enabledFormats
    ? savedSettings.enabledFormats.includes("mermaid")
    : savedSettings?.mermaid ?? false;

  const integrationId = integration?.id;

  const {
    register,
    reset,
    watch,
    setValue,
    handleSubmit: formHandleSubmit,
    formState,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      url: savedUrl,
      mermaid: savedMermaid,
    },
  });

  React.useEffect(() => {
    reset({ url: savedUrl, mermaid: savedMermaid });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrationId]);

  const mermaidValue = watch("mermaid");

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        const formats = await fetchSupportedFormats(data.url);
        const enabledFormats = data.mermaid
          ? formats
          : formats.filter((f) => f !== "mermaid");

        await integrations.save({
          id: integration?.id,
          type: IntegrationType.Embed,
          service: IntegrationService.Kroki,
          settings: {
            kroki: {
              url: data.url.replace(/\/?$/, ""),
              enabledFormats,
            },
          } as Integration<IntegrationType.Embed>["settings"],
        });

        toast.success(t("Settings saved"));
      } catch (err) {
        toast.error(errToString(err));
      }
    },
    [integrations, integration, t]
  );

  const handleCancel = React.useCallback(() => {
    reset({ url: savedUrl, mermaid: savedMermaid });
  }, [reset, savedUrl, savedMermaid]);

  return (
    <IntegrationScene title="Kroki" icon={<Icon />}>
      <Heading>Kroki</Heading>

      <Text as="p" type="secondary">
        <Trans>
          Configure a Kroki server to enable rendering of diagrams in
          documents. All diagram formats supported by the server will be
          enabled automatically. You can use the public instance at
          kroki.io or self-host for privacy.
        </Trans>
      </Text>
      <form onSubmit={formHandleSubmit(handleSubmit)}>
        <SettingRow
          label={t("Service URL")}
          name="url"
          description={t(
            "The URL of your Kroki instance. All supported diagram formats will be enabled automatically."
          )}
          border={false}
        >
          <Input
            placeholder="https://kroki.io"
            {...register("url", { required: true })}
          />
        </SettingRow>

        <SettingRow
          label={t("Render Mermaid via Kroki")}
          name="mermaid"
          description={t(
            "When enabled, Mermaid diagrams are rendered by the Kroki server instead of in the browser."
          )}
          border={false}
        >
          <Switch
            id="mermaid"
            checked={mermaidValue}
            onChange={(checked) => {
              setValue("mermaid", checked, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            }}
          />
        </SettingRow>

        <Actions reverse justify="end" gap={8}>
          <StyledSubmit
            type="submit"
            disabled={
              !formState.isDirty || !formState.isValid || formState.isSubmitting
            }
          >
            {formState.isSubmitting ? `${t("Saving")}…` : t("Save")}
          </StyledSubmit>

          {formState.isDirty && (
            <Button
              onClick={handleCancel}
              disabled={formState.isSubmitting}
              neutral
            >
              {t("Cancel")}
            </Button>
          )}

          <Button
            action={disconnectIntegrationFactory(integration)}
            disabled={formState.isSubmitting}
            neutral
            hideIcon
            hideOnActionDisabled
          >
            {t("Disconnect")}
          </Button>
        </Actions>
      </form>
    </IntegrationScene>
  );
}

const Actions = styled(Flex)`
  margin-top: 8px;
`;

const StyledSubmit = styled(Button)`
  width: 80px;
`;

export default observer(Kroki);
