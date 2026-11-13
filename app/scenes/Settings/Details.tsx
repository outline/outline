import { isHexColor } from "class-validator";
import { debounce, pickBy } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { TeamIcon } from "outline-icons";
import { useState } from "react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import { ThemeProvider } from "styled-components";
import { errToString } from "@shared/utils/error";
import { buildDarkTheme, buildLightTheme } from "@shared/styles/theme";
import type { CustomTheme, TeamPreferences } from "@shared/types";
import { TOCPosition, TeamPreference, UserPreference } from "@shared/types";
import { getBaseDomain } from "@shared/utils/domains";
import { TeamValidation } from "@shared/validations";
import { AvatarVariant } from "~/components/Avatar/Avatar";
import Button from "~/components/Button";
import ButtonLink from "~/components/ButtonLink";
import DefaultCollectionInputSelect from "~/components/DefaultCollectionInputSelect";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import type { Option } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import type Team from "~/models/Team";
import isCloudHosted from "~/utils/isCloudHosted";
import TeamDelete from "../TeamDelete";
import ImageInput from "./components/ImageInput";
import SettingRow from "./components/SettingRow";
import { SettingsSection } from "./components/SettingsSection";
import { ThemeColorInputs } from "./components/ThemeColorInputs";

type TeamUpdate = Partial<
  Pick<Team, "name" | "description" | "subdomain" | "defaultCollectionId">
> & { preferences?: TeamPreferences };

function Details() {
  const { dialogs, ui } = useStores();
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const can = usePolicy(team);

  const [accent, setAccent] = useState<null | undefined | string>(
    team.preferences?.customTheme?.accent
  );
  const [accentText, setAccentText] = useState<null | undefined | string>(
    team.preferences?.customTheme?.accentText
  );
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || "");
  const [subdomain, setSubdomain] = useState(team.subdomain);

  const customTheme: Partial<CustomTheme> = React.useMemo(
    () =>
      pickBy(
        {
          accent,
          accentText,
        },
        isHexColor
      ),
    [accent, accentText]
  );

  const tocPositionOptions: Option[] = React.useMemo(
    () =>
      [
        {
          type: "item",
          label: t("Left"),
          value: TOCPosition.Left,
        },
        {
          type: "item",
          label: t("Right"),
          value: TOCPosition.Right,
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
    async (data: TeamUpdate) => {
      try {
        await team.save(data);
        showSuccessMessage();
        return true;
      } catch (err) {
        toast.error(errToString(err));
        return false;
      }
    },
    [team, showSuccessMessage]
  );

  const savePreference = React.useCallback(
    <T extends TeamPreference>(key: T, value: TeamPreferences[T]) =>
      saveData({ preferences: { [key]: value } }),
    [saveData]
  );

  const saveTheme = React.useMemo(
    () =>
      debounce((theme: Partial<CustomTheme>) => {
        void savePreference(TeamPreference.CustomTheme, theme);
      }, 500),
    [savePreference]
  );

  // Save a pending theme change when the user leaves the page.
  React.useEffect(() => () => saveTheme.flush(), [saveTheme]);

  const handleThemeChange = React.useCallback(
    (
      nextAccent: string | null | undefined,
      nextText: string | null | undefined
    ) => {
      // Wait until every entered color is complete or empty before saving.
      const isReady = (value: string | null | undefined) =>
        !value || value === "#" || isHexColor(value);
      if (!isReady(nextAccent) || !isReady(nextText)) {
        return;
      }
      saveTheme(
        pickBy({ accent: nextAccent, accentText: nextText }, isHexColor)
      );
    },
    [saveTheme]
  );

  const handleAccentChange = React.useCallback(
    (value: string) => {
      setAccent(value);
      handleThemeChange(value, accentText);
    },
    [accentText, handleThemeChange]
  );

  const handleAccentTextChange = React.useCallback(
    (value: string) => {
      setAccentText(value);
      handleThemeChange(accent, value);
    },
    [accent, handleThemeChange]
  );

  const handleResetTheme = React.useCallback(() => {
    setAccent(null);
    setAccentText(null);
    saveTheme.cancel();
    void savePreference(TeamPreference.CustomTheme, {});
  }, [saveTheme, savePreference]);

  const handleSubmit = React.useCallback((ev: React.FormEvent) => {
    ev.preventDefault();
  }, []);

  const handleKeyDown = React.useCallback((ev: React.KeyboardEvent) => {
    // Text fields save on blur, so Enter saves the focused field.
    if (
      ev.key === "Enter" &&
      !ev.nativeEvent.isComposing &&
      ev.target instanceof HTMLInputElement &&
      ev.currentTarget.contains(ev.target)
    ) {
      ev.preventDefault();
      ev.target.blur();
    }
  }, []);

  const handleNameChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setName(ev.target.value);
    },
    []
  );

  const handleNameBlur = React.useCallback(async () => {
    if (name === team.name) {
      return;
    }
    if (!name.trim() || !(await saveData({ name }))) {
      setName(team.name);
    }
  }, [name, team, saveData]);

  const handleDescriptionChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setDescription(ev.target.value);
    },
    []
  );

  const handleDescriptionBlur = React.useCallback(async () => {
    if (description === (team.description || "")) {
      return;
    }
    if (!(await saveData({ description }))) {
      setDescription(team.description || "");
    }
  }, [description, team, saveData]);

  const handleSubdomainChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setSubdomain(ev.target.value.toLowerCase());
    },
    []
  );

  const handleSubdomainBlur = React.useCallback(async () => {
    if (subdomain === team.subdomain) {
      return;
    }
    if (!(await saveData({ subdomain }))) {
      setSubdomain(team.subdomain);
    }
  }, [subdomain, team, saveData]);

  const handlePublicBrandingChange = React.useCallback(
    (checked: boolean) =>
      savePreference(TeamPreference.PublicBranding, checked),
    [savePreference]
  );

  const handleTocPositionChange = React.useCallback(
    (position: string) =>
      savePreference(TeamPreference.TocPosition, position as TOCPosition),
    [savePreference]
  );

  const handleSelectCollection = React.useCallback(
    (value: string) =>
      saveData({ defaultCollectionId: value === "home" ? null : value }),
    [saveData]
  );

  const handleAvatarChange = async (avatarUrl: string | null) => {
    await team.save({ avatarUrl });
    toast.success(t("Logo updated"));
  };

  const handleAvatarError = React.useCallback(
    (error: string | null | undefined) => {
      toast.error(error || t("Unable to upload new logo"));
    },
    [t]
  );

  const showDeleteWorkspace = () => {
    dialogs.openModal({
      title: t("Delete workspace"),
      content: <TeamDelete onSubmit={dialogs.closeAllModals} />,
    });
  };

  const handleSeamlessEditChange = React.useCallback(
    async (checked: boolean) => {
      if (!(await savePreference(TeamPreference.SeamlessEdit, !checked))) {
        return;
      }

      // Enabling separate editing also applies it to the current user.
      if (checked) {
        try {
          user.setPreference(UserPreference.SeamlessEdit, false);
          await user.save();
        } catch (err) {
          toast.error(errToString(err));
        }
      }
    },
    [savePreference, user]
  );

  const newTheme = React.useMemo(
    () =>
      ui.resolvedTheme === "light"
        ? buildLightTheme(customTheme)
        : buildDarkTheme(customTheme),
    [customTheme, ui.resolvedTheme]
  );

  return (
    <ThemeProvider theme={newTheme}>
      <Scene title={t("General")} icon={<TeamIcon />}>
        <Heading>{t("General")}</Heading>
        <Text as="p" type="secondary">
          <Trans>
            These settings affect the way that your workspace appears to
            everyone on the team.
          </Trans>
        </Text>

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
          <SettingsSection title={t("Appearance")}>
            <SettingRow
              label={t("Logo")}
              name="avatarUrl"
              description={t(
                "The logo is displayed at the top left of the application."
              )}
            >
              <ImageInput
                alt={t("Workspace logo")}
                onSuccess={handleAvatarChange}
                onError={handleAvatarError}
                model={team}
                borderRadius={0}
                variant={AvatarVariant.Square}
              />
            </SettingRow>
            <SettingRow
              label={t("Name")}
              name="name"
              description={t(
                "The workspace name, usually the same as your company name."
              )}
            >
              <Input
                id="name"
                autoComplete="organization"
                value={name}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                maxLength={TeamValidation.maxNameLength}
                showCharacterCount
                required
              />
            </SettingRow>
            <SettingRow
              label={t("Description")}
              name="description"
              description={t("A short description of your workspace.")}
            >
              <Input
                id="description"
                value={description}
                onChange={handleDescriptionChange}
                onBlur={handleDescriptionBlur}
                maxLength={TeamValidation.maxDescriptionLength}
                showCharacterCount
              />
            </SettingRow>
            <SettingRow
              label={t("Theme")}
              name="accent"
              description={
                <>
                  {t("Customize the interface look and feel.")}{" "}
                  {accent && (
                    <ButtonLink onClick={handleResetTheme}>
                      {t("Reset theme")}
                    </ButtonLink>
                  )}
                </>
              }
            >
              <ThemeColorInputs
                accent={accent}
                accentText={accentText}
                onAccentChange={handleAccentChange}
                onAccentTextChange={handleAccentTextChange}
              />
            </SettingRow>
            {(team.avatarUrl || team.description) && (
              <SettingRow
                name={TeamPreference.PublicBranding}
                label={t("Public branding")}
                description={t(
                  "Show your workspace logo, description, and branding on publicly shared pages."
                )}
              >
                <Switch
                  id={TeamPreference.PublicBranding}
                  name={TeamPreference.PublicBranding}
                  checked={!!team.getPreference(TeamPreference.PublicBranding)}
                  onChange={handlePublicBrandingChange}
                />
              </SettingRow>
            )}
            <SettingRow
              label={t("Table of contents position")}
              name="tocPosition"
              description={t(
                "The side to display the table of contents in relation to the main content."
              )}
            >
              <InputSelect
                options={tocPositionOptions}
                value={
                  team.getPreference(TeamPreference.TocPosition) || undefined
                }
                onChange={handleTocPositionChange}
                label={t("Table of contents position")}
                labelHidden
              />
            </SettingRow>
          </SettingsSection>

          <SettingsSection title={t("Behavior")}>
            <SettingRow
              visible={isCloudHosted}
              label={t("Subdomain")}
              name="subdomain"
              description={
                subdomain ? (
                  <>
                    <Trans>Your workspace will be accessible at</Trans>{" "}
                    <strong>
                      {subdomain}.{getBaseDomain()}
                    </strong>
                  </>
                ) : (
                  t(
                    "Choose a subdomain to enable a login page just for your team."
                  )
                )
              }
            >
              <Input
                id="subdomain"
                value={subdomain || ""}
                onChange={handleSubdomainChange}
                onBlur={handleSubdomainBlur}
                autoComplete="off"
                minLength={TeamValidation.minSubdomainLength}
                maxLength={
                  isCloudHosted
                    ? TeamValidation.maxSubdomainLength
                    : TeamValidation.maxSubdomainSelfHostedLength
                }
              />
            </SettingRow>
            <SettingRow
              label={t("Start view")}
              name="defaultCollectionId"
              description={t(
                "This is the screen that workspace members will first see when they sign in."
              )}
            >
              <DefaultCollectionInputSelect
                onSelectCollection={handleSelectCollection}
                defaultCollectionId={team.defaultCollectionId}
              />
            </SettingRow>
            <SettingRow
              name={TeamPreference.SeamlessEdit}
              label={t("Separate editing")}
              description={t(
                "When enabled, documents have a separate editing mode by default instead of being always editable. This setting can be overridden by user preferences."
              )}
            >
              <Switch
                id={TeamPreference.SeamlessEdit}
                name={TeamPreference.SeamlessEdit}
                checked={!team.getPreference(TeamPreference.SeamlessEdit)}
                onChange={handleSeamlessEditChange}
              />
            </SettingRow>
          </SettingsSection>
        </form>

        {can.delete && (
          <SettingsSection title={t("Danger")} danger>
            <SettingRow
              name="delete"
              label={t("Delete workspace")}
              description={t(
                "You can delete this entire workspace including collections, documents, and users."
              )}
            >
              <span>
                <Button onClick={showDeleteWorkspace} neutral>
                  {t("Delete workspace")}…
                </Button>
              </span>
            </SettingRow>
          </SettingsSection>
        )}
      </Scene>
    </ThemeProvider>
  );
}

export default observer(Details);
