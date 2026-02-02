import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import Button from "~/components/Button";
import Input from "~/components/Input";
import Text from "~/components/Text";
import useCurrentUser from "~/hooks/useCurrentUser";
import useRequest from "~/hooks/useRequest";
import SettingRow from "~/scenes/Settings/components/SettingRow";
import { client } from "~/utils/ApiClient";

const PLUGIN_ID = "bitrix24";

function Bitrix24ConfigurationForm() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [clientId, setClientId] = React.useState("");
  const [clientSecret, setClientSecret] = React.useState("");
  const [domain, setDomain] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const { data: config, loading, request: loadConfig } = useRequest(
    async () => {
      const res = await client.post("/pluginConfigurations.info", {
        pluginId: PLUGIN_ID,
      });
      return res?.data?.config || {};
    },
    true
  );

  React.useEffect(() => {
    if (config) {
      setClientId(config.BITRIX24_CLIENT_ID || "");
      setClientSecret(config.BITRIX24_CLIENT_SECRET || "");
      setDomain(config.BITRIX24_DOMAIN || "bitrix24.com");
    }
  }, [config]);

  const handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      await client.post("/pluginConfigurations.update", {
        pluginId: PLUGIN_ID,
        config: {
          BITRIX24_CLIENT_ID: clientId || undefined,
          BITRIX24_CLIENT_SECRET: clientSecret || undefined,
          BITRIX24_DOMAIN: domain || undefined,
        },
      });

      toast.success(t("Configuration saved"));
      void loadConfig();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("Failed to save configuration");
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClientIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setClientId(event.target.value);
  };

  const handleClientSecretChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setClientSecret(event.target.value);
  };

  const handleDomainChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDomain(event.target.value);
  };

  if (loading) {
    return <Text type="secondary">{t("Loading...")}</Text>;
  }

  if (!user.isAdmin) {
    return null;
  }

  const isValid = formRef.current?.checkValidity();
  const hasChanges =
    clientId !== (config?.BITRIX24_CLIENT_ID || "") ||
    clientSecret !== (config?.BITRIX24_CLIENT_SECRET || "") ||
    domain !== (config?.BITRIX24_DOMAIN || "bitrix24.com");

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      <Text as="p" type="secondary">
        <Trans>
          Configure Bitrix24 integration settings. These settings are stored in
          the database and can be managed by administrators.
        </Trans>
      </Text>

      <SettingRow
        label={t("Bitrix24 domain")}
        name="bitrix24Domain"
        description={t(
          "The Bitrix24 portal domain (for example: example.bitrix24.com)."
        )}
      >
        <Input
          id="bitrix24Domain"
          name="bitrix24Domain"
          type="text"
          value={domain}
          onChange={handleDomainChange}
          placeholder="example.bitrix24.com"
          flex
          required
        />
      </SettingRow>

      <SettingRow
        label={t("Client ID")}
        name="bitrix24ClientId"
        description={t("OAuth client ID from your Bitrix24 application.")}
      >
        <Input
          id="bitrix24ClientId"
          name="bitrix24ClientId"
          type="text"
          value={clientId}
          onChange={handleClientIdChange}
          placeholder={t("Client ID")}
          flex
          required
        />
      </SettingRow>

      <SettingRow
        label={t("Client Secret")}
        name="bitrix24ClientSecret"
        description={t(
          "OAuth client secret from your Bitrix24 application. This will be stored securely."
        )}
        border={false}
      >
        <Input
          id="bitrix24ClientSecret"
          name="bitrix24ClientSecret"
          type="password"
          value={clientSecret}
          onChange={handleClientSecretChange}
          placeholder={t("Client Secret")}
          flex
          required
        />
      </SettingRow>

      <Button type="submit" disabled={isSaving || !isValid || !hasChanges}>
        {isSaving ? `${t("Saving")}…` : t("Save")}
      </Button>
    </form>
  );
}

export default observer(Bitrix24ConfigurationForm);

