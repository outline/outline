import { observer } from "mobx-react";
import { BeakerIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TeamPreference } from "@shared/types";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import SettingRow from "./components/SettingRow";

function Features() {
  const team = useCurrentTeam();
  const { t } = useTranslation();

  const handlePreferenceChange =
    (inverted = false) =>
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      team.setPreference(
        ev.target.name as TeamPreference,
        inverted ? !ev.target.checked : ev.target.checked
      );
      await team.save();
      toast.success(t("Settings saved"));
    };

  return (
    <Scene title={t("Features")} icon={<BeakerIcon />}>
      <Heading>{t("Features")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Manage optional and beta features. Changing these settings will affect
          the experience for all members of the workspace.
        </Trans>
      </Text>
      <SettingRow
        name={TeamPreference.SeamlessEdit}
        label={t("Separate editing")}
        description={t(
          `When enabled documents have a separate editing mode by default instead of being always editable. This setting can be overridden by user preferences.`
        )}
      >
        <Switch
          id={TeamPreference.SeamlessEdit}
          name={TeamPreference.SeamlessEdit}
          checked={!team.getPreference(TeamPreference.SeamlessEdit)}
          onChange={handlePreferenceChange(true)}
        />
      </SettingRow>
      <SettingRow
        name={TeamPreference.Commenting}
        label={t("Commenting")}
        description={t(
          "When enabled team members can add comments to documents."
        )}
      >
        <Switch
          id={TeamPreference.Commenting}
          name={TeamPreference.Commenting}
          checked={team.getPreference(TeamPreference.Commenting)}
          onChange={handlePreferenceChange(false)}
        />
      </SettingRow>
    </Scene>
  );
}

export default observer(Features);
