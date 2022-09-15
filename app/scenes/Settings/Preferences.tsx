import { observer } from "mobx-react";
import { SettingsIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import SettingRow from "./components/SettingRow";

function Preferences() {
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const { auth } = useStores();
  const user = useCurrentUser();

  const handleChange = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const newPreferences = {
      ...user.preferences,
      [ev.target.name]: ev.target.checked,
    };

    await auth.updateUser({
      preferences: newPreferences,
    });
    showToast(t("Preferences saved"), {
      type: "success",
    });
  };

  return (
    <Scene
      title={t("Preferences")}
      icon={<SettingsIcon color="currentColor" />}
    >
      <Heading>{t("Preferences")}</Heading>
      <SettingRow
        name="rememberLastPath"
        label={t("Remember previous location")}
        description={t(
          "When enabled, user's previous location will be remembered and they'll be redirected to that location upon next visit."
        )}
      >
        <Switch
          id="rememberLastPath"
          name="rememberLastPath"
          checked={!!user.preferences && user.preferences.rememberLastPath}
          onChange={handleChange}
        />
      </SettingRow>
    </Scene>
  );
}

export default observer(Preferences);
