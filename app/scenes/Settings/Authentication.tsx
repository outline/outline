import { observer } from "mobx-react";
import { EmailIcon, PadlockIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import type AuthenticationProvider from "~/models/AuthenticationProvider";
import PluginIcon from "~/components/PluginIcon";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import SettingRow from "./components/SettingRow";
import { setPostLoginPath } from "~/hooks/useLastVisitedPath";
import { settingsPath } from "~/utils/routeHelpers";
import DomainManagement from "./components/DomainManagement";
import Button from "~/components/Button";
import { ConnectedIcon } from "~/components/Icons/ConnectedIcon";
import { useTheme } from "styled-components";
import { VStack } from "~/components/primitives/VStack";

function Authentication() {
  const { authenticationProviders, dialogs } = useStores();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const theme = useTheme();

  const {
    data: providers,
    loading,
    request,
  } = useRequest(authenticationProviders.fetchPage);

  React.useEffect(() => {
    if (!providers && !loading) {
      void request();
    }
  }, [loading, providers, request]);

  const handleGuestSigninChange = React.useCallback(
    async (checked: boolean) => {
      try {
        await team.save({ guestSignin: checked });
        toast.success(t("Settings saved"));
      } catch (err) {
        toast.error(err.message);
      }
    },
    [team, t]
  );

  const handleToggleProvider = React.useCallback(
    async (provider: AuthenticationProvider, isEnabled: boolean) => {
      try {
        await provider.save({ isEnabled });
        toast.success(t("Settings saved"));
      } catch (err) {
        toast.error(err.message);
      }
    },
    [t]
  );

  const handleRemoveProvider = React.useCallback(
    async (provider: AuthenticationProvider) => {
      dialogs.openModal({
        title: t("Are you sure?"),
        content: (
          <ConfirmationDialog
            onSubmit={async () => {
              await provider.delete();
              toast.success(t("Settings saved"));
            }}
            savingText={`${t("Removing")}…`}
            danger
          >
            {t(
              "Removing this authentication provider will prevent members from signing in with {{ authProvider }}.",
              {
                authProvider: provider.displayName,
              }
            )}
          </ConfirmationDialog>
        ),
      });
    },
    [dialogs, t]
  );

  const handleConnectProvider = React.useCallback((name: string) => {
    setPostLoginPath(settingsPath("authentication"));
    window.location.href = `/auth/${name}?host=${window.location.host}`;
  }, []);

  const showSuccessMessage = React.useMemo(
    () => () => toast.success(t("Settings saved")),
    [t]
  );

  return (
    <Scene title={t("Authentication")} icon={<PadlockIcon />}>
      <Heading>{t("Authentication")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Manage how members sign-in to your workspace and which authentication
          providers are enabled.
        </Trans>
      </Text>

      <Heading as="h2">{t("Sign In")}</Heading>

      {authenticationProviders.orderedData.map((provider) => (
        <SettingRow
          key={provider.name}
          label={
            <Flex gap={8} align="center">
              <PluginIcon id={provider.name} /> {provider.displayName}
            </Flex>
          }
          name={provider.name}
          description={
            provider.isConnected
              ? t("Allow members to sign-in with {{ authProvider }}", {
                  authProvider: provider.displayName,
                })
              : t("Connect {{ authProvider }} to allow members to sign-in", {
                  authProvider: provider.displayName,
                })
          }
        >
          <Flex align="center" gap={12}>
            {provider.isConnected ? (
              <VStack align="start">
                <Button
                  icon={
                    provider.isEnabled ? (
                      <ConnectedIcon />
                    ) : (
                      <ConnectedIcon color={theme.textSecondary} />
                    )
                  }
                  onClick={() =>
                    !provider.isEnabled
                      ? handleToggleProvider(provider, true)
                      : handleRemoveProvider(provider)
                  }
                  neutral
                >
                  {provider.isEnabled ? t("Connected") : t("Disabled")}
                </Button>
                <Text type="tertiary" size="small">
                  {provider.providerId}
                </Text>
              </VStack>
            ) : (
              <Button
                onClick={() => handleConnectProvider(provider.name)}
                neutral
              >
                {t("Connect")}
              </Button>
            )}
          </Flex>
        </SettingRow>
      ))}
      <SettingRow
        label={
          <Flex gap={8} align="center">
            <EmailIcon /> {t("Email")}
          </Flex>
        }
        name="guestSignin"
        description={
          env.EMAIL_ENABLED
            ? t("Allow members to sign-in using their email address")
            : t("The server must have SMTP configured to enable this setting")
        }
        border={false}
      >
        <Switch
          id="guestSignin"
          checked={team.guestSignin}
          onChange={handleGuestSigninChange}
          disabled={!env.EMAIL_ENABLED}
        />
      </SettingRow>

      <SettingRow
        label={
          <Flex gap={8} align="center">
            <PadlockIcon /> {t("Passkeys")}
          </Flex>
        }
        name="passkeysEnabled"
        description={t("Allow members to sign-in with a WebAuthn passkey")}
      >
        <Switch
          id="passkeysEnabled"
          checked={team.passkeysEnabled}
          onChange={async (checked) => {
            try {
              await team.save({ passkeysEnabled: checked });
              toast.success(t("Settings saved"));
            } catch (err) {
              toast.error(err.message);
            }
          }}
        />
      </SettingRow>

      <Heading as="h2">{t("Restrictions")}</Heading>
      <DomainManagement onSuccess={showSuccessMessage} />
    </Scene>
  );
}

export default observer(Authentication);
