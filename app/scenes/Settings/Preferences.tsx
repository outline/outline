import { observer } from "mobx-react";
import { SettingsIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { languageOptions as availableLanguages } from "@shared/i18n";
import {
  NotificationBadgeType,
  TeamPreference,
  UserPreference,
} from "@shared/types";
import { Theme } from "~/stores/UiStore";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import type { Option } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
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

  const languageOptions: Option[] = React.useMemo(
    () =>
      availableLanguages.map(
        (lang) =>
          ({
            type: "item",
            label: lang.label,
            value: lang.value,
          }) satisfies Option
      ),
    []
  );

  const themeOptions: Option[] = React.useMemo(
    () =>
      [
        { type: "item", label: t("Light"), value: Theme.Light },
        { type: "item", label: t("Dark"), value: Theme.Dark },
        { type: "item", label: t("System"), value: Theme.System },
      ] satisfies Option[],
    [t]
  );

  const handleUseCursorPointerChange = React.useCallback(
    async (checked: boolean) => {
      user.setPreference(UserPreference.UseCursorPointer, checked);
      await user.save();
      toast.success(t("Preferences saved"));
    },
    [user, t]
  );

  const handleCodeBlockLineNumbersChange = React.useCallback(
    async (checked: boolean) => {
      user.setPreference(UserPreference.CodeBlockLineNumers, checked);
      await user.save();
      toast.success(t("Preferences saved"));
    },
    [user, t]
  );

  const handleSeamlessEditChange = React.useCallback(
    async (checked: boolean) => {
      user.setPreference(UserPreference.SeamlessEdit, !checked);
      await user.save();
      toast.success(t("Preferences saved"));
    },
    [user, t]
  );

  const handleRememberLastPathChange = React.useCallback(
    async (checked: boolean) => {
      user.setPreference(UserPreference.RememberLastPath, checked);
      await user.save();
      toast.success(t("Preferences saved"));
    },
    [user, t]
  );

  const handleEnableSmartTextChange = React.useCallback(
    async (checked: boolean) => {
      user.setPreference(UserPreference.EnableSmartText, checked);
      await user.save();
      toast.success(t("Preferences saved"));
    },
    [user, t]
  );

  const notificationBadgeOptions: Option[] = React.useMemo(
    () => [
      {
        type: "item",
        label: t("Disabled"),
        value: NotificationBadgeType.Disabled,
      },
      {
        type: "item",
        label: t("Unread count"),
        value: NotificationBadgeType.Count,
      },
      {
        type: "item",
        label: t("Unread indicator"),
        value: NotificationBadgeType.Indicator,
      },
    ],
    [t]
  );

  const handleNotificationBadgeChange = React.useCallback(
    async (value: string) => {
      user.setPreference(
        UserPreference.NotificationBadge,
        value as NotificationBadgeType
      );
      await user.save();
      toast.success(t("Preferences saved"));
    },
    [user, t]
  );

  const handleLanguageChange = React.useCallback(
    async (language: string) => {
      await user.save({ language });
      toast.success(t("Preferences saved"));
    },
    [t, user]
  );

  const handleThemeChange = React.useCallback(
    (theme) => {
      ui.setTheme(theme as Theme);
      toast.success(t("Preferences saved"));
    },
    [t, ui]
  );

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
          options={languageOptions}
          value={user.language}
          onChange={handleLanguageChange}
          label={t("Language")}
          hideLabel
        />
      </SettingRow>
      <SettingRow
        name="theme"
        label={t("Appearance")}
        description={t("Choose your preferred interface color scheme.")}
      >
        <InputSelect
          options={themeOptions}
          value={ui.theme}
          onChange={handleThemeChange}
          label={t("Appearance")}
          hideLabel
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
          onChange={handleUseCursorPointerChange}
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
          onChange={handleCodeBlockLineNumbersChange}
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
          onChange={handleSeamlessEditChange}
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
          onChange={handleRememberLastPathChange}
        />
      </SettingRow>
      <SettingRow
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
          onChange={handleEnableSmartTextChange}
        />
      </SettingRow>
      <SettingRow
        border={false}
        name={UserPreference.NotificationBadge}
        label={t("Notification badge")}
        description={t(
          "Choose how unread notifications are indicated on the app icon."
        )}
      >
        <InputSelect
          options={notificationBadgeOptions}
          value={user.getPreference(UserPreference.NotificationBadge)}
          onChange={handleNotificationBadgeChange}
          label={t("Notification badge")}
          hideLabel
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
