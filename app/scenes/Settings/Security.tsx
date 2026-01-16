import debounce from "lodash/debounce";
import { observer } from "mobx-react";
import { ShieldIcon } from "outline-icons";
import { useState } from "react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import { TeamPreference, EmailDisplay } from "@shared/types";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Heading from "~/components/Heading";
import type { Option } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import isCloudHosted from "~/utils/isCloudHosted";
import SettingRow from "./components/SettingRow";

function Security() {
  const { dialogs } = useStores();
  const team = useCurrentTeam();
  const { t } = useTranslation();

  const [data, setData] = useState({
    sharing: team.sharing,
    documentEmbeds: team.documentEmbeds,
    defaultUserRole: team.defaultUserRole,
    memberCollectionCreate: team.memberCollectionCreate,
    memberTeamCreate: team.memberTeamCreate,
    inviteRequired: team.inviteRequired,
    passkeysEnabled: team.passkeysEnabled,
  });

  const userRoleOptions: Option[] = React.useMemo(
    () =>
      [
        {
          type: "item",
          label: t("Editor"),
          value: "member",
        },
        {
          type: "item",
          label: t("Viewer"),
          value: "viewer",
        },
      ] satisfies Option[],
    [t]
  );

  const emailDisplayOptions: Option[] = React.useMemo(
    () =>
      [
        {
          type: "item",
          label: t("Members"),
          value: EmailDisplay.Members,
        },
        {
          type: "item",
          label: t("Members and guests"),
          value: EmailDisplay.Everyone,
        },
        {
          type: "item",
          label: t("No one"),
          value: EmailDisplay.None,
        },
      ] satisfies Option[],
    [t]
  );

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

  const handleDefaultRoleChange = React.useCallback(
    async (newDefaultRole: string) => {
      await saveData({ defaultUserRole: newDefaultRole });
    },
    [saveData]
  );

  const handleSharingChange = React.useCallback(
    async (checked: boolean) => {
      await saveData({ sharing: checked });
    },
    [saveData]
  );

  const handleDocumentEmbedsChange = React.useCallback(
    async (checked: boolean) => {
      await saveData({ documentEmbeds: checked });
    },
    [saveData]
  );

  const handlePasskeysEnabledChange = React.useCallback(
    async (checked: boolean) => {
      await saveData({ passkeysEnabled: checked });
    },
    [saveData]
  );

  const handleMemberCollectionCreateChange = React.useCallback(
    async (checked: boolean) => {
      await saveData({ memberCollectionCreate: checked });
    },
    [saveData]
  );

  const handleMemberTeamCreateChange = React.useCallback(
    async (checked: boolean) => {
      await saveData({ memberTeamCreate: checked });
    },
    [saveData]
  );

  const handleMembersCanInviteChange = React.useCallback(
    async (checked: boolean) => {
      const preferences = {
        ...team.preferences,
        [TeamPreference.MembersCanInvite]: checked,
      };
      await saveData({ preferences });
    },
    [saveData, team.preferences]
  );

  const handleViewersCanExportChange = React.useCallback(
    async (checked: boolean) => {
      const preferences = {
        ...team.preferences,
        [TeamPreference.ViewersCanExport]: checked,
      };
      await saveData({ preferences });
    },
    [saveData, team.preferences]
  );

  const handleMembersCanDeleteAccountChange = React.useCallback(
    async (checked: boolean) => {
      const preferences = {
        ...team.preferences,
        [TeamPreference.MembersCanDeleteAccount]: checked,
      };
      await saveData({ preferences });
    },
    [saveData, team.preferences]
  );

  const handleEmailDisplayChange = React.useCallback(
    async (emailDisplay: string) => {
      const preferences = {
        ...team.preferences,
        [TeamPreference.EmailDisplay]: emailDisplay,
      };
      await saveData({ preferences });
    },
    [saveData, team.preferences]
  );

  const handleInviteRequiredChange = React.useCallback(
    async (checked: boolean) => {
      const inviteRequired = checked;
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
      } else {
        await saveData(newData);
      }
    },
    [data, saveData, t, dialogs, team.signinMethods]
  );

  return (
    <Scene title={t("Security")} icon={<ShieldIcon />}>
      <Heading>{t("Security")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Settings that impact the access, security, and content of your
          workspace.
        </Trans>
      </Text>

      <Heading as="h2">{t("Invites")}</Heading>
      <SettingRow
        label={t("Allow users to send invites")}
        name={TeamPreference.MembersCanInvite}
        description={t("Allow editors to invite other people to the workspace")}
      >
        <Switch
          id={TeamPreference.MembersCanInvite}
          checked={team.getPreference(TeamPreference.MembersCanInvite)}
          onChange={handleMembersCanInviteChange}
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
            value={data.defaultUserRole}
            options={userRoleOptions}
            onChange={handleDefaultRoleChange}
            label={t("Default role")}
            hideLabel
            short
          />
        </SettingRow>
      )}

      <Heading as="h2">{t("Authentication")}</Heading>
      <SettingRow
        label={t("Passkeys")}
        name="passkeysEnabled"
        description={t(
          "Allow users to sign in with passkeys for passwordless authentication"
        )}
      >
        <Switch
          id="passkeysEnabled"
          checked={data.passkeysEnabled}
          onChange={handlePasskeysEnabledChange}
        />
      </SettingRow>

      <Heading as="h2">{t("Behavior")}</Heading>
      <SettingRow
        label={t("Public document sharing")}
        name="sharing"
        description={t(
          "When enabled, documents can be shared publicly on the internet by any member of the workspace"
        )}
      >
        <Switch
          id="sharing"
          checked={data.sharing}
          onChange={handleSharingChange}
        />
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
          onChange={handleViewersCanExportChange}
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
          onChange={handleMembersCanDeleteAccountChange}
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
          onChange={handleDocumentEmbedsChange}
        />
      </SettingRow>
      <SettingRow
        label={t("Email address visibility")}
        name={TeamPreference.EmailDisplay}
        description={t(
          "Controls who can see user email addresses in the workspace"
        )}
      >
        <InputSelect
          value={team.getPreference(TeamPreference.EmailDisplay) as string}
          options={emailDisplayOptions}
          onChange={handleEmailDisplayChange}
          label={t("Email address visibility")}
          hideLabel
          short
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
          onChange={handleMemberCollectionCreateChange}
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
            onChange={handleMemberTeamCreateChange}
          />
        </SettingRow>
      )}
    </Scene>
  );
}

export default observer(Security);
