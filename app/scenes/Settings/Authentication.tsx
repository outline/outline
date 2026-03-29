import { observer } from "mobx-react";
import { EmailIcon, PadlockIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import { InputSelect } from "~/components/InputSelect";
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
import { client } from "~/utils/ApiClient";
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

  const handleToggleGroupSync = React.useCallback(
    (provider: AuthenticationProvider, checked: boolean) => {
      if (checked) {
        void (async () => {
          try {
            await provider.save({
              settings: {
                ...provider.settings,
                groupSyncEnabled: true,
              },
            });
            toast.success(t("Settings saved"));
          } catch (err) {
            toast.error(err.message);
          }
        })();
      } else {
        dialogs.openModal({
          title: t("Disable group sync"),
          content: (
            <DisableGroupSyncDialog
              provider={provider}
              onSubmit={dialogs.closeAllModals}
            />
          ),
        });
      }
    },
    [t, dialogs]
  );

  const handleGroupClaimChange = React.useCallback(
    async (provider: AuthenticationProvider, groupClaim: string) => {
      try {
        await provider.save({
          settings: {
            ...provider.settings,
            groupClaim,
          },
        });
        toast.success(t("Settings saved"));
      } catch (err) {
        toast.error(err.message);
      }
    },
    [t]
  );

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
        <React.Fragment key={provider.name}>
          <SettingRow
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
            border={!(provider.isActive && provider.groupSyncSupported)}
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
          {provider.isActive && provider.groupSyncSupported && (
            <SettingRow
              label={t("Group sync")}
              name={`groupSync-${provider.name}`}
              description={t(
                "Sync group memberships from {{ authProvider }} on each sign-in",
                { authProvider: provider.displayName }
              )}
              border={
                !(
                  provider.settings?.groupSyncEnabled &&
                  provider.groupSyncUsesClaim
                )
              }
            >
              <Switch
                id={`groupSync-${provider.name}`}
                checked={provider.settings?.groupSyncEnabled ?? false}
                onChange={(checked) => handleToggleGroupSync(provider, checked)}
              />
            </SettingRow>
          )}
          {provider.isActive &&
            provider.groupSyncSupported &&
            provider.groupSyncUsesClaim &&
            provider.settings?.groupSyncEnabled && (
              <SettingRow
                label={t("Group claim")}
                name={`groupClaim-${provider.name}`}
                description={t(
                  "The claim in the provider response that contains group names (e.g. groups, roles)"
                )}
                border={false}
              >
                <Input
                  id={`groupClaim-${provider.name}`}
                  defaultValue={provider.settings?.groupClaim ?? "groups"}
                  placeholder="groups"
                  onBlur={(ev: React.FocusEvent<HTMLInputElement>) => {
                    const value = ev.target.value.trim();
                    if (value !== (provider.settings?.groupClaim ?? "")) {
                      void handleGroupClaimChange(provider, value);
                    }
                  }}
                />
              </SettingRow>
            )}
        </React.Fragment>
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

const DisableGroupSyncDialog = observer(function DisableGroupSyncDialog({
  provider,
  onSubmit,
}: {
  provider: AuthenticationProvider;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  const [action, setAction] = React.useState("keep");
  const [isSaving, setIsSaving] = React.useState(false);

  const options = React.useMemo(
    () => [
      {
        type: "item" as const,
        label: t("Keep synced groups"),
        description: t("Groups will remain but no longer update"),
        value: "keep",
      },
      {
        type: "item" as const,
        label: t("Delete synced groups"),
        description: t("Remove all groups created by sync"),
        value: "delete",
      },
    ],
    [t]
  );

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsSaving(true);
      try {
        await provider.save({
          settings: {
            ...provider.settings,
            groupSyncEnabled: false,
          },
        });

        if (action === "delete") {
          await client.post("/groups.deleteAll", {
            authenticationProviderId: provider.id,
          });
        }

        toast.success(t("Settings saved"));
        onSubmit();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [provider, action, onSubmit, t]
  );

  return (
    <form onSubmit={handleSubmit}>
      <Flex gap={12} column>
        <Text type="secondary">
          {t(
            "Group memberships will no longer be synced from {{ authProvider }} when members sign in.",
            { authProvider: provider.displayName }
          )}
        </Text>
        <InputSelect
          label={t("Existing groups")}
          options={options}
          value={action}
          onChange={setAction}
        />
        <Flex justify="flex-end">
          <Button type="submit" disabled={isSaving} danger>
            {isSaving ? `${t("Disabling")}…` : t("Disable")}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
});

export default observer(Authentication);
