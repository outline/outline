import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import Button from "~/components/Button";
import Input from "~/components/Input";
import Text from "~/components/Text";
import { client } from "~/utils/ApiClient";
import useCurrentUser from "~/hooks/useCurrentUser";
import useRequest from "~/hooks/useRequest";
import SettingRow from "~/scenes/Settings/components/SettingRow";

const PLUGIN_ID = "confluence";

function ConfluenceConfigurationForm() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const form = React.useRef<HTMLFormElement>(null);
  const [url, setUrl] = React.useState<string>("");
  const [clientId, setClientId] = React.useState<string>("");
  const [clientSecret, setClientSecret] = React.useState<string>("");
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

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
      setUrl(config.CONFLUENCE_URL || "");
      setClientId(config.CONFLUENCE_CLIENT_ID || "");
      setClientSecret(config.CONFLUENCE_CLIENT_SECRET || "");
    }
  }, [config]);

  const handleSubmit = async (ev: React.SyntheticEvent) => {
    ev.preventDefault();
    setIsSaving(true);

    try {
      await client.post("/pluginConfigurations.update", {
        pluginId: PLUGIN_ID,
        config: {
          CONFLUENCE_URL: url || undefined,
          CONFLUENCE_CLIENT_ID: clientId || undefined,
          CONFLUENCE_CLIENT_SECRET: clientSecret || undefined,
        },
      });
      toast.success(t("Configuration saved"));
      void loadConfig();
    } catch (err: any) {
      toast.error(err.message || t("Failed to save configuration"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUrlChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(ev.target.value);
  };

  const handleClientIdChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setClientId(ev.target.value);
  };

  const handleClientSecretChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setClientSecret(ev.target.value);
  };

  if (loading) {
    return <Text type="secondary">{t("Loading...")}</Text>;
  }

  if (!user.isAdmin) {
    return null;
  }

  const isValid = form.current?.checkValidity();
  const hasChanges =
    url !== (config?.CONFLUENCE_URL || "") ||
    clientId !== (config?.CONFLUENCE_CLIENT_ID || "") ||
    clientSecret !== (config?.CONFLUENCE_CLIENT_SECRET || "");

  return (
    <form onSubmit={handleSubmit} ref={form}>
      <Text as="p" type="secondary">
        <Trans>
          Configure Confluence integration settings. These settings are stored
          in the database and can be managed by administrators.
        </Trans>
      </Text>

      <SettingRow
        label={t("Confluence URL")}
        name="confluenceUrl"
        description={t(
          "The base URL of your Confluence instance (e.g., https://yourcompany.atlassian.net/wiki)"
        )}
      >
        <Input
          id="confluenceUrl"
          name="confluenceUrl"
          type="text"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://yourcompany.atlassian.net/wiki"
          flex
        />
      </SettingRow>

      <SettingRow
        label={t("Client ID")}
        name="clientId"
        description={t("OAuth client ID from Confluence")}
      >
        <Input
          id="clientId"
          name="clientId"
          type="text"
          value={clientId}
          onChange={handleClientIdChange}
          placeholder={t("Client ID")}
          flex
        />
      </SettingRow>

      <SettingRow
        label={t("Client Secret")}
        name="clientSecret"
        description={t("OAuth client secret from Confluence")}
        border={false}
      >
        <Input
          id="clientSecret"
          name="clientSecret"
          type="password"
          value={clientSecret}
          onChange={handleClientSecretChange}
          placeholder={t("Client Secret")}
          flex
        />
      </SettingRow>

      <Button type="submit" disabled={isSaving || !isValid || !hasChanges}>
        {isSaving ? `${t("Saving")}…` : t("Save")}
      </Button>
    </form>
  );
}

export default observer(ConfluenceConfigurationForm);
