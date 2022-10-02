import { observer } from "mobx-react";
import { BeakerIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { TeamPreference } from "@shared/types";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import SettingRow from "./components/SettingRow";

function Features() {
  const { auth } = useStores();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { showToast } = useToasts();

  const handlePreferenceChange = async (
    ev: React.ChangeEvent<HTMLInputElement>
  ) => {
    const preferences = {
      ...team.preferences,
      [ev.target.name]: ev.target.checked,
    };

    await auth.updateTeam({ preferences });
    showToast(t("Settings saved"), {
      type: "success",
    });
  };

  return (
    <Scene title={t("Features")} icon={<BeakerIcon color="currentColor" />}>
      <Heading>{t("Features")}</Heading>
      <Text type="secondary">
        <Trans>
          Manage optional and beta features. Changing these settings will affect
          the experience for all team members.
        </Trans>
      </Text>
      {team.collaborativeEditing && (
        <SettingRow
          name="seamlessEdit"
          label={t("Seamless editing")}
          description={t(
            "When enabled, documents are always editable for team members that have permissions without extra clicks."
          )}
        >
          <Switch
            id="seamlessEdit"
            name="seamlessEdit"
            checked={team.getPreference(TeamPreference.SeamlessEdit, true)}
            onChange={handlePreferenceChange}
          />
        </SettingRow>
      )}
    </Scene>
  );
}

export default observer(Features);
