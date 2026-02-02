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

const PLUGIN_ID = "gitlab";

function GitLabConfigurationForm() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [url, setUrl] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [clientSecret, setClientSecret] = React.useState("");
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
      setUrl(config.GITLAB_URL || "");
      setClientId(config.GITLAB_CLIENT_ID || "");
      setClientSecret(config.GITLAB_CLIENT_SECRET || "");
    }
  }, [config]);

  const handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      await client.post("/pluginConfigurations.update", {
        pluginId: PLUGIN_ID,
        config: {
          GITLAB_URL: url || undefined,
          GITLAB_CLIENT_ID: clientId || undefined,
          GITLAB_CLIENT_SECRET: clientSecret || undefined,
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

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
  };

  const handleClientIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setClientId(event.target.value);
  };

  const handleClientSecretChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setClientSecret(event.target.value);
  };

  if (loading) {
    return <Text type="secondary">{t("Loading...")}</Text>;
  }

  if (!user.isAdmin) {
    return null;
  }

  const isValid = formRef.current?.checkValidity();
  const hasChanges =
    url !== (config?.GITLAB_URL || "") ||
    clientId !== (config?.GITLAB_CLIENT_ID || "") ||
    clientSecret !== (config?.GITLAB_CLIENT_SECRET || "");

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      <Text as="p" type="secondary">
        <Trans>
          Configure GitLab integration settings. These settings are stored in the
          database and can be managed by administrators.
        </Trans>
      </Text>

      <SettingRow
        label={t("GitLab URL")}
        name="gitlabUrl"
        description={t(
          "The base URL of your GitLab instance (for GitLab.com use https://gitlab.com)."
        )}
      >
        <Input
          id="gitlabUrl"
          name="gitlabUrl"
          type="text"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://gitlab.com"
          flex
          required
        />
      </SettingRow>

      <SettingRow
        label={t("Client ID")}
        name="gitlabClientId"
        description={t("OAuth client ID from your GitLab application.")}
      >
        <Input
          id="gitlabClientId"
          name="gitlabClientId"
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
        name="gitlabClientSecret"
        description={t(
          "OAuth client secret from your GitLab application. This will be stored securely."
        )}
        border={false}
      >
        <Input
          id="gitlabClientSecret"
          name="gitlabClientSecret"
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

export default observer(GitLabConfigurationForm);

