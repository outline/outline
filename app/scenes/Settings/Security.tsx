import debounce from "lodash/debounce";
import { observer } from "mobx-react";
import { CheckboxIcon, EmailIcon, PadlockIcon } from "outline-icons";
import { useState } from "react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import { useTheme } from "styled-components";
import { TeamPreference } from "@shared/types";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import InputSelect from "~/components/InputSelect";
import PluginIcon from "~/components/PluginIcon";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import isCloudHosted from "~/utils/isCloudHosted";
import DomainManagement from "./components/DomainManagement";
import SettingRow from "./components/SettingRow";

function Security() {
  const { authenticationProviders, dialogs } = useStores();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const theme = useTheme();
  const [data, setData] = useState({
    sharing: team.sharing,
    documentEmbeds: team.documentEmbeds,
    guestSignin: team.guestSignin,
    defaultUserRole: team.defaultUserRole,
    memberCollectionCreate: team.memberCollectionCreate,
    memberTeamCreate: team.memberTeamCreate,
    inviteRequired: team.inviteRequired,
  });

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

  const showSuccessMessage = React.useMemo(
    () =>
      debounce(() => {
        toast.success(t("Settings saved"));
      }, 250),
    [t]
  );

  const saveData = React.useCallback(
    async (newData) => {
      try {
        setData((prev) => ({ ...prev, ...newData }));
        await team.save(newData);
        showSuccessMessage();
      } catch (err) {
        toast.error(err.message);
      }
    },
    [team, showSuccessMessage]
  );

  const handleChange = React.useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      await saveData({ [ev.target.id]: ev.target.checked });
    },
    [saveData]
  );

  const handleDefaultRoleChange = React.useCallback(
    async (newDefaultRole: string) => {
      await saveData({ defaultUserRole: newDefaultRole });
    },
    [saveData]
  );

  const handlePreferenceChange = React.useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const preferences = {
        ...team.preferences,
        [ev.target.id]: ev.target.checked,
      };
      await saveData({ preferences });
    },
    [saveData, team.preferences]
  );

  const handleInviteRequiredChange = React.useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const inviteRequired = ev.target.checked;
      const newData = { ...data, inviteRequired };

      if (inviteRequired) {
        dialogs.openModal({
          title: t("Are you sure you want to require invites?"),
          content: (
            <ConfirmationDialog
              onSubmit={async () => {
                await saveData(newData);
              }}
              savingText={`${t("Saving")}…`}
              danger
            >
              <Trans
                defaults="New users will first need to be invited to create an account. <em>Default role</em> and <em>Allowed domains</em> will no longer apply."
                values={{
                  authenticationMethods: team.signinMethods,
                }}
                components={{
                  em: <strong />,
                }}
              />
            </ConfirmationDialog>
          ),
        });
        return;
      }

      await saveData(newData);
    },
    [data, saveData, t, dialogs, team.signinMethods]
  );

  return (
    <Scene title={t("Security")} icon={<PadlockIcon />}>
      <Heading>{t("Security")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Settings that impact the access, security, and content of your
          workspace.
        </Trans>
      </Text>

      <h2>{t("Sign In")}</h2>
      {authenticationProviders.orderedData
        // filtering unconnected, until we have ability to connect from this screen
        .filter((provider) => provider.isConnected)
        .map((provider) => (
          <SettingRow
            key={provider.name}
            label={
              <Flex gap={8} align="center">
                <PluginIcon id={provider.name} /> {provider.displayName}
              </Flex>
            }
            name={provider.name}
            description={t("Allow members to sign-in with {{ authProvider }}", {
              authProvider: provider.displayName,
            })}
          >
            <Flex align="center">
              <CheckboxIcon
                color={provider.isActive ? theme.accent : undefined}
                checked={provider.isActive}
              />{" "}
              <Text as="p" type="secondary">
                {provider.isActive ? t("Connected") : t("Disabled")}
              </Text>
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
          checked={data.guestSignin}
          onChange={handleChange}
          disabled={!env.EMAIL_ENABLED}
        />
      </SettingRow>

      <h2>{t("Access")}</h2>
      <SettingRow
        label={t("Allow users to send invites")}
        name={TeamPreference.MembersCanInvite}
        description={t("Allow editors to invite other people to the workspace")}
      >
        <Switch
          id={TeamPreference.MembersCanInvite}
          checked={team.getPreference(TeamPreference.MembersCanInvite)}
          onChange={handlePreferenceChange}
        />
      </SettingRow>
      {isCloudHosted && (
        <SettingRow
          label={t("Require invites")}
          name="inviteRequired"
          description={t(
            "Require members to be invited to the workspace before they can create an account using SSO."
          )}
        >
          <Switch
            id="inviteRequired"
            checked={data.inviteRequired}
            onChange={handleInviteRequiredChange}
          />
        </SettingRow>
      )}

      {!data.inviteRequired && (
        <SettingRow
          label={t("Default role")}
          name="defaultUserRole"
          description={t(
            "The default user role for new accounts. Changing this setting does not affect existing user accounts."
          )}
          border={false}
        >
          <InputSelect
            id="defaultUserRole"
            value={data.defaultUserRole}
            options={[
              {
                label: t("Editor"),
                value: "member",
              },
              {
                label: t("Viewer"),
                value: "viewer",
              },
            ]}
            onChange={handleDefaultRoleChange}
            ariaLabel={t("Default role")}
            short
          />
        </SettingRow>
      )}

      <DomainManagement onSuccess={showSuccessMessage} />

      <h2>{t("Behavior")}</h2>
      <SettingRow
        label={t("Public document sharing")}
        name="sharing"
        description={t(
          "When enabled, documents can be shared publicly on the internet by any member of the workspace"
        )}
      >
        <Switch id="sharing" checked={data.sharing} onChange={handleChange} />
      </SettingRow>
      <SettingRow
        label={t("Viewer document exports")}
        name={TeamPreference.ViewersCanExport}
        description={t(
          "When enabled, viewers can see download options for documents"
        )}
      >
        <Switch
          id={TeamPreference.ViewersCanExport}
          checked={team.getPreference(TeamPreference.ViewersCanExport)}
          onChange={handlePreferenceChange}
        />
      </SettingRow>
      <SettingRow
        label={t("Users can delete account")}
        name={TeamPreference.MembersCanDeleteAccount}
        description={t(
          "When enabled, users can delete their own account from the workspace"
        )}
      >
        <Switch
          id={TeamPreference.MembersCanDeleteAccount}
          checked={team.getPreference(TeamPreference.MembersCanDeleteAccount)}
          onChange={handlePreferenceChange}
        />
      </SettingRow>
      <SettingRow
        label={t("Rich service embeds")}
        name="documentEmbeds"
        description={t(
          "Links to supported services are shown as rich embeds within your documents"
        )}
      >
        <Switch
          id="documentEmbeds"
          checked={data.documentEmbeds}
          onChange={handleChange}
        />
      </SettingRow>
      <SettingRow
        label={t("Collection creation")}
        name="memberCollectionCreate"
        description={t(
          "Allow editors to create new collections within the workspace"
        )}
      >
        <Switch
          id="memberCollectionCreate"
          checked={data.memberCollectionCreate}
          onChange={handleChange}
        />
      </SettingRow>
      {isCloudHosted && (
        <SettingRow
          label={t("Workspace creation")}
          name="memberTeamCreate"
          description={t("Allow editors to create new workspaces")}
        >
          <Switch
            id="memberTeamCreate"
            checked={data.memberTeamCreate}
            onChange={handleChange}
          />
        </SettingRow>
      )}
    </Scene>
  );
}

export default observer(Security);
