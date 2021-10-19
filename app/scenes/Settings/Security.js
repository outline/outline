// @flow
import { debounce } from "lodash";
import { observer } from "mobx-react";
import { PadlockIcon } from "outline-icons";
import * as React from "react";
import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import Checkbox from "components/Checkbox";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import InputSelect from "components/InputSelect";
import Scene from "components/Scene";
import env from "env";
import useCurrentTeam from "hooks/useCurrentTeam";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";

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
  });

  const notes = {
    member: t("New user accounts will be given member permissions by default"),
    viewer: t("New user accounts will be given viewer permissions by default"),
  };

  const showSuccessMessage = React.useMemo(
    () =>
      debounce(() => {
        showToast(t("Settings saved"), { type: "success" });
      }, 250),
    [showToast, t]
  );

  const handleChange = React.useCallback(
    async (ev: SyntheticInputEvent<*>) => {
      const newData = { ...data, [ev.target.name]: ev.target.checked };
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
      <Heading>
        <Trans>Security</Trans>
      </Heading>
      <HelpText>
        <Trans>
          Settings that impact the access, security, and content of your
          knowledge base.
        </Trans>
      </HelpText>

      <Checkbox
        label={t("Allow email authentication")}
        name="guestSignin"
        checked={data.guestSignin}
        onChange={handleChange}
        note={
          env.EMAIL_ENABLED
            ? t("When enabled, users can sign-in using their email address")
            : t("The server must have SMTP configured to enable this setting")
        }
        disabled={!env.EMAIL_ENABLED}
      />
      <Checkbox
        label={t("Public document sharing")}
        name="sharing"
        checked={data.sharing}
        onChange={handleChange}
        note={t(
          "When enabled, documents can be shared publicly on the internet by any team member"
        )}
      />
      <Checkbox
        label={t("Rich service embeds")}
        name="documentEmbeds"
        checked={data.documentEmbeds}
        onChange={handleChange}
        note={t(
          "Links to supported services are shown as rich embeds within your documents"
        )}
      />
      <InputSelect
        value={data.defaultUserRole}
        label="Default role"
        options={[
          { label: t("Member"), value: "member" },
          { label: t("Viewer"), value: "viewer" },
        ]}
        onChange={handleDefaultRoleChange}
        ariaLabel={t("Default role")}
        note={notes[data.defaultUserRole]}
        short
      />
    </Scene>
  );
}

export default observer(Security);
