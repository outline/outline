import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import { toast } from "sonner";
import { s } from "@shared/styles";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";
import env from "~/env";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import { redirectTo } from "~/utils/urls";

/**
 * Dialog that presents the user with options to connect to GitLab Cloud
 * or a self-managed GitLab instance.
 */
function GitLabConnectDialog() {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const [showCustomForm, setShowCustomForm] = React.useState(
    !env.GITLAB_CLIENT_ID
  );
  const [customUrl, setCustomUrl] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [clientSecret, setClientSecret] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleConnect = React.useCallback(
    async (params: {
      url?: string;
      clientId?: string;
      clientSecret?: string;
    }) => {
      setSaving(true);
      try {
        const res = await client.post("/gitlab.connect", params);
        dialogs.closeAllModals();
        redirectTo(res.data.redirectUrl);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setSaving(false);
      }
    },
    [dialogs]
  );

  const handleConnectCloud = React.useCallback(async () => {
    await handleConnect({});
  }, [handleConnect]);

  const handleConnectCustom = React.useCallback(
    async (ev: React.FormEvent) => {
      ev.preventDefault();
      const url = customUrl.trim().replace(/\/+$/, "");
      await handleConnect({
        url,
        clientId: clientId.trim() || undefined,
        clientSecret: clientSecret.trim() || undefined,
      });
    },
    [customUrl, clientId, clientSecret, handleConnect]
  );

  if (showCustomForm) {
    return (
      <form onSubmit={handleConnectCustom}>
        <Flex column gap={12}>
          <Text as="p" type="secondary">
            <Trans>Enter the details for your GitLab instance.</Trans>
          </Text>
          <Input
            label={t("GitLab URL")}
            placeholder="https://gitlab.example.com"
            value={customUrl}
            onChange={(ev) => setCustomUrl(ev.currentTarget.value)}
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
            label={t("Client Secret")}
            placeholder={t("OAuth application secret")}
            value={clientSecret}
            onChange={(ev) => setClientSecret(ev.currentTarget.value)}
            type="password"
            required
          />
          <Flex justify="flex-end" gap={8}>
            {env.GITLAB_CLIENT_ID && (
              <Button
                neutral
                onClick={() => setShowCustomForm(false)}
                disabled={saving}
              >
                {t("Back")}
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                !customUrl.trim() ||
                !clientId.trim() ||
                !clientSecret.trim() ||
                saving
              }
            >
              {saving ? `${t("Connecting")}…` : t("Connect")}
            </Button>
          </Flex>
        </Flex>
      </form>
    );
  }

  return (
    <Flex column gap={8}>
      <Text as="p" type="secondary">
        <Trans>Choose which GitLab instance to connect to.</Trans>
      </Text>
      <Option
        onClick={handleConnectCloud}
        disabled={saving || !env.GITLAB_CLIENT_ID}
      >
        <OptionTitle>{t("GitLab Cloud")}</OptionTitle>
        <OptionDescription>
          {env.GITLAB_CLIENT_ID
            ? t("Connect to your account on gitlab.com")
            : t("GitLab Cloud credentials are not configured")}
        </OptionDescription>
      </Option>
      <Option onClick={() => setShowCustomForm(true)} disabled={saving}>
        <OptionTitle>{t("Self-managed")}</OptionTitle>
        <OptionDescription>
          {t("Connect to a custom GitLab installation")}
        </OptionDescription>
      </Option>
    </Flex>
  );
}

const Option = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 12px;
  border: 1px solid ${s("inputBorder")};
  border-radius: 8px;
  background: ${s("background")};
  cursor: pointer;
  text-align: left;
  width: 100%;

  &:hover {
    background: ${s("listItemHoverBackground")};
    border-color: ${s("textTertiary")};
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const OptionTitle = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${s("text")};
`;

const OptionDescription = styled.span`
  font-size: 13px;
  color: ${s("textTertiary")};
`;

export default GitLabConnectDialog;
