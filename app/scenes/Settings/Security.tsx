import { debounce } from "lodash";
import { observer } from "mobx-react";
import { PadlockIcon } from "outline-icons";
import { useState } from "react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Heading from "~/components/Heading";
import InputSelect from "~/components/InputSelect";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import isHosted from "~/utils/isHosted";
import SettingRow from "./components/SettingRow";

function Security() {
  const { auth, dialogs } = useStores();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const [data, setData] = useState({
    sharing: team.sharing,
    documentEmbeds: team.documentEmbeds,
    guestSignin: team.guestSignin,
    defaultUserRole: team.defaultUserRole,
    memberCollectionCreate: team.memberCollectionCreate,
    inviteRequired: team.inviteRequired,
  });

  const authenticationMethods = team.signinMethods;

  const showSuccessMessage = React.useMemo(
    () =>
      debounce(() => {
        showToast(t("Settings saved"), {
          type: "success",
        });
      }, 250),
    [showToast, t]
  );

  const saveData = React.useCallback(
    async (newData) => {
      try {
        setData(newData);
        await auth.updateTeam(newData);
        showSuccessMessage();
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      }
    },
    [auth, showSuccessMessage, showToast]
  );

  const handleChange = React.useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      await saveData({ ...data, [ev.target.id]: ev.target.checked });
    },
    [data, saveData]
  );

  const handleDefaultRoleChange = React.useCallback(
    async (newDefaultRole: string) => {
      await saveData({ ...data, defaultUserRole: newDefaultRole });
    },
    [data, saveData]
  );

  const handleAllowSignupsChange = React.useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const inviteRequired = !ev.target.checked;
      const newData = { ...data, inviteRequired };

      if (inviteRequired) {
        dialogs.openModal({
          isCentered: true,
          title: t("Are you sure you want to disable authorized signups?"),
          content: (
            <ConfirmationDialog
              onSubmit={async () => {
                await saveData(newData);
              }}
              submitText={t("I’m sure — Disable")}
              savingText={`${t("Disabling")}…`}
              danger
            >
              <Trans
                defaults="New account creation using <em>{{ authenticationMethods }}</em> will be disabled. New users will need to be invited."
                values={{
                  authenticationMethods,
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
    [data, saveData, t, dialogs, authenticationMethods]
  );

  return (
    <Scene title={t("Security")} icon={<PadlockIcon color="currentColor" />}>
      <Heading>{t("Security")}</Heading>
      <Text type="secondary">
        <Trans>
          Settings that impact the access, security, and content of your
          knowledge base.
        </Trans>
      </Text>

      <SettingRow
        label={t("Allow email authentication")}
        name="guestSignin"
        description={
          env.EMAIL_ENABLED
            ? t("When enabled, users can sign-in using their email address")
            : t("The server must have SMTP configured to enable this setting")
        }
      >
        <Switch
          id="guestSignin"
          checked={data.guestSignin}
          onChange={handleChange}
          disabled={!env.EMAIL_ENABLED}
        />
      </SettingRow>
      <SettingRow
        label={t("Public document sharing")}
        name="sharing"
        description={t(
          "When enabled, documents can be shared publicly on the internet by any team member"
        )}
      >
        <Switch id="sharing" checked={data.sharing} onChange={handleChange} />
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
          "Allow members to create new collections within the knowledge base"
        )}
      >
        <Switch
          id="memberCollectionCreate"
          checked={data.memberCollectionCreate}
          onChange={handleChange}
        />
      </SettingRow>
      {isHosted && (
        <SettingRow
          label={t("Allow authorized signups")}
          name="allowSignups"
          description={
            <Trans
              defaults="Allow authorized <em>{{ authenticationMethods }}</em> users to create new accounts without first receiving an invite"
              values={{
                authenticationMethods,
              }}
              components={{
                em: <strong />,
              }}
            />
          }
        >
          <Switch
            id="allowSignups"
            checked={!data.inviteRequired}
            onChange={handleAllowSignupsChange}
          />
        </SettingRow>
      )}

      <SettingRow
        label={t("Default role")}
        name="defaultUserRole"
        description={t(
          "The default user role for new accounts. Changing this setting does not affect existing user accounts."
        )}
      >
        <InputSelect
          id="defaultUserRole"
          value={data.defaultUserRole}
          options={[
            {
              label: t("Member"),
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
    </Scene>
  );
}

export default observer(Security);
