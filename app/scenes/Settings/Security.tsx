import { debounce } from "lodash";
import { observer } from "mobx-react";
import { PadlockIcon } from "outline-icons";
import { useState } from "react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Heading from "~/components/Heading";
import InputSelect from "~/components/InputSelect";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import SettingRow from "./components/SettingRow";

function Security() {
  const { auth } = useStores();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const [data, setData] = useState({
    sharing: team.sharing,
    documentEmbeds: team.documentEmbeds,
    guestSignin: team.guestSignin,
    defaultUserRole: team.defaultUserRole,
    memberCollectionCreate: team.memberCollectionCreate,
  });

  const showSuccessMessage = React.useMemo(
    () =>
      debounce(() => {
        showToast(t("Settings saved"), {
          type: "success",
        });
      }, 250),
    [showToast, t]
  );

  const handleChange = React.useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const newData = { ...data, [ev.target.id]: ev.target.checked };
      setData(newData);
      await auth.updateTeam(newData);
      showSuccessMessage();
    },
    [auth, data, showSuccessMessage]
  );

  const handleDefaultRoleChange = async (newDefaultRole: string) => {
    const newData = { ...data, defaultUserRole: newDefaultRole };
    setData(newData);
    await auth.updateTeam(newData);
    showSuccessMessage();
  };

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
