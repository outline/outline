import { observer } from "mobx-react";
import { SettingsIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { languageOptions } from "@shared/i18n";
import { TeamPreference, UserPreference } from "@shared/types";
import { Theme } from "~/stores/UiStore";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import InputSelect from "~/components/InputSelect";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import UserDelete from "../UserDelete";
import SettingRow from "./components/SettingRow";

function Preferences() {
  const { t } = useTranslation();
  const { ui, dialogs } = useStores();
  const user = useCurrentUser();
  const team = useCurrentTeam();
  const can = usePolicy(user.id);

  const handlePreferenceChange =
    (inverted = false) =>
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      user.setPreference(
        ev.target.name as UserPreference,
        inverted ? !ev.target.checked : ev.target.checked
      );
      await user.save();
      toast.success(t("Preferences saved"));
    };

  const handleLanguageChange = async (language: string) => {
    await user.save({ language });
    toast.success(t("Preferences saved"));
  };

  const showDeleteAccount = () => {
    dialogs.openModal({
      title: t("Delete account"),
      content: <UserDelete onSubmit={dialogs.closeAllModals} />,
    });
  };

  return (
    <Scene title={t("Preferences")} icon={<SettingsIcon />}>
      <Heading>{t("Preferences")}</Heading>
      <Text as="p" type="secondary">
        <Trans>Manage settings that affect your personal experience.</Trans>
      </Text>

      <Heading as="h2">{t("Display")}</Heading>
      <SettingRow
        label={t("Language")}
        name="language"
        description={
          <>
            <Trans>
              Choose the interface language. Community translations are accepted
              though our{" "}
              <a
                href="https://translate.getoutline.com"
                target="_blank"
                rel="noreferrer"
              >
                translation portal
              </a>
              .
            </Trans>
          </>
        }
      >
        <InputSelect
          id="language"
          options={languageOptions}
          value={user.language}
          onChange={handleLanguageChange}
          ariaLabel={t("Language")}
        />
      </SettingRow>
      <SettingRow
        name="theme"
        label={t("Appearance")}
        description={t("Choose your preferred interface color scheme.")}
      >
        <InputSelect
          ariaLabel={t("Appearance")}
          options={[
            { label: t("Light"), value: Theme.Light },
            { label: t("Dark"), value: Theme.Dark },
            { label: t("System"), value: Theme.System },
          ]}
          value={ui.resolvedTheme}
          onChange={(theme) => {
            ui.setTheme(theme as Theme);
            toast.success(t("Preferences saved"));
          }}
        />
      </SettingRow>
      <SettingRow
        name={UserPreference.UseCursorPointer}
        label={t("Use pointer cursor")}
        description={t(
          "Show a hand cursor when hovering over interactive elements."
        )}
      >
        <Switch
          id={UserPreference.UseCursorPointer}
          name={UserPreference.UseCursorPointer}
          checked={user.getPreference(UserPreference.UseCursorPointer)}
          onChange={handlePreferenceChange(false)}
        />
      </SettingRow>
      <SettingRow
        name={UserPreference.CodeBlockLineNumers}
        label={t("Show line numbers")}
        description={t("Show line numbers on code blocks in documents.")}
        border={false}
      >
        <Switch
          id={UserPreference.CodeBlockLineNumers}
          name={UserPreference.CodeBlockLineNumers}
          checked={user.getPreference(UserPreference.CodeBlockLineNumers)}
          onChange={handlePreferenceChange(false)}
        />
      </SettingRow>

      <Heading as="h2">{t("Behavior")}</Heading>
      <SettingRow
        name={UserPreference.SeamlessEdit}
        label={t("Separate editing")}
        description={t(
          `When enabled, documents have a separate editing mode. When disabled, documents are always editable when you have permission.`
        )}
      >
        <Switch
          id={UserPreference.SeamlessEdit}
          name={UserPreference.SeamlessEdit}
          checked={
            !user.getPreference(
              UserPreference.SeamlessEdit,
              team.getPreference(TeamPreference.SeamlessEdit)
            )
          }
          onChange={handlePreferenceChange(true)}
        />
      </SettingRow>
      <SettingRow
        name={UserPreference.RememberLastPath}
        label={t("Remember previous location")}
        description={t(
          "Automatically return to the document you were last viewing when the app is re-opened."
        )}
      >
        <Switch
          id={UserPreference.RememberLastPath}
          name={UserPreference.RememberLastPath}
          checked={!!user.getPreference(UserPreference.RememberLastPath)}
          onChange={handlePreferenceChange(false)}
        />
      </SettingRow>
      <SettingRow
        border={false}
        name={UserPreference.EnableSmartText}
        label={t("Smart text replacements")}
        description={t(
          "Auto-format text by replacing shortcuts with symbols, dashes, smart quotes, and other typographical elements."
        )}
      >
        <Switch
          id={UserPreference.EnableSmartText}
          name={UserPreference.EnableSmartText}
          checked={!!user.getPreference(UserPreference.EnableSmartText)}
          onChange={handlePreferenceChange(false)}
        />
      </SettingRow>

      {can.delete && (
        <>
          <Heading as="h2">{t("Danger")}</Heading>
          <SettingRow
            name="delete"
            label={t("Delete account")}
            description={t(
              "You may delete your account at any time, note that this is unrecoverable"
            )}
          >
            <span>
              <Button onClick={showDeleteAccount} neutral>
                {t("Delete account")}…
              </Button>
            </span>
          </SettingRow>
        </>
      )}
    </Scene>
  );
}

export default observer(Preferences);
