import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import { redirectTo } from "~/utils/urls";
import { GiteaUtils } from "../../shared/GiteaUtils";

/**
 * Dialog that collects the details of a Gitea instance and its OAuth
 * application, then starts the OAuth flow.
 */
export function GiteaConnectDialog() {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const [url, setUrl] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [clientSecret, setClientSecret] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const redirectUri = GiteaUtils.callbackUrl();

  const handleSubmit = React.useCallback(
    async (ev: React.FormEvent) => {
      ev.preventDefault();
      setSaving(true);

      try {
        const res = await client.post("/gitea.connect", {
          url: url.trim().replace(/\/+$/, ""),
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        });
        dialogs.closeAllModals();
        redirectTo(res.data.redirectUrl);
      } catch (err) {
        toast.error(errToString(err));
      } finally {
        setSaving(false);
      }
    },
    [url, clientId, clientSecret, dialogs]
  );

  const handleFocusRedirectUri = React.useCallback(
    (ev: React.FocusEvent<HTMLInputElement>) => ev.currentTarget.select(),
    []
  );

  return (
    <form onSubmit={handleSubmit}>
      <Flex column gap={12}>
        <Text as="p" type="secondary">
          <Trans>
            Create an OAuth2 application in the settings of your Gitea or
            Forgejo instance with the redirect URI below, then enter its
            details.
          </Trans>
        </Text>
        <Input
          label={t("Redirect URI")}
          value={redirectUri}
          onFocus={handleFocusRedirectUri}
          readOnly
        />
        <Input
          label={t("Gitea URL")}
          placeholder="https://gitea.example.com"
          value={url}
          onChange={(ev) => setUrl(ev.currentTarget.value)}
          pattern="https://.*"
          title={t("URL must start with https")}
          required
          autoFocus
        />
        <Input
          label={t("Client ID")}
          placeholder={t("OAuth application ID")}
          value={clientId}
          onChange={(ev) => setClientId(ev.currentTarget.value)}
          required
        />
        <Input
          label={t("Client secret")}
          placeholder={t("OAuth application secret")}
          value={clientSecret}
          onChange={(ev) => setClientSecret(ev.currentTarget.value)}
          type="password"
          required
        />
        <Flex justify="flex-end">
          <Button
            type="submit"
            disabled={
              !url.trim() || !clientId.trim() || !clientSecret.trim() || saving
            }
          >
            {saving ? `${t("Connecting")}…` : t("Connect")}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
