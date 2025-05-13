import { isHexColor } from "class-validator";
import pickBy from "lodash/pickBy";
import { observer } from "mobx-react";
import { TeamIcon } from "outline-icons";
import { useRef, useState } from "react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import { ThemeProvider, useTheme } from "styled-components";
import { buildDarkTheme, buildLightTheme } from "@shared/styles/theme";
import { CustomTheme, TOCPosition, TeamPreference } from "@shared/types";
import { getBaseDomain } from "@shared/utils/domains";
import Button from "~/components/Button";
import ButtonLink from "~/components/ButtonLink";
import DefaultCollectionInputSelect from "~/components/DefaultCollectionInputSelect";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import InputColor from "~/components/InputColor";
import { InputSelectNew, Option } from "~/components/InputSelectNew";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import isCloudHosted from "~/utils/isCloudHosted";
import TeamDelete from "../TeamDelete";
import { ActionRow } from "./components/ActionRow";
import ImageInput from "./components/ImageInput";
import SettingRow from "./components/SettingRow";

function Details() {
  const { dialogs, ui } = useStores();
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const theme = useTheme();
  const can = usePolicy(team);

  const form = useRef<HTMLFormElement>(null);
  const [accent, setAccent] = useState<null | undefined | string>(
    team.preferences?.customTheme?.accent
  );
  const [accentText, setAccentText] = useState<null | undefined | string>(
    team.preferences?.customTheme?.accentText
  );
  const [name, setName] = useState(team.name);
  const [subdomain, setSubdomain] = useState(team.subdomain);
  const [publicBranding, setPublicBranding] = useState(
    team.preferences?.publicBranding
  );
  const [defaultCollectionId, setDefaultCollectionId] = useState<string | null>(
    team.defaultCollectionId
  );

  const customTheme: Partial<CustomTheme> = pickBy(
    {
      accent,
      accentText,
    },
    isHexColor
  );

  const [tocPosition, setTocPosition] = useState(
    team.getPreference(TeamPreference.TocPosition) as TOCPosition
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

  const handleTocPositionChange = React.useCallback((position: string) => {
    setTocPosition(position as TOCPosition);
  }, []);

  const handleSubmit = React.useCallback(
    async (event?: React.SyntheticEvent) => {
      if (event) {
        event.preventDefault();
      }

      try {
        await team.save({
          name,
          subdomain,
          defaultCollectionId,
          preferences: {
            ...team.preferences,
            publicBranding,
            customTheme,
            tocPosition,
          },
        });
        toast.success(t("Settings saved"));
      } catch (err) {
        toast.error(err.message);
      }
    },
    [
      tocPosition,
      team,
      name,
      subdomain,
      defaultCollectionId,
      publicBranding,
      customTheme,
      t,
    ]
  );

  const handleNameChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setName(ev.target.value);
    },
    []
  );

  const handleSubdomainChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setSubdomain(ev.target.value.toLowerCase());
    },
    []
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

  const onSelectCollection = React.useCallback((value: string) => {
    const selectedValue = value === "home" ? null : value;
    setDefaultCollectionId(selectedValue);
  }, []);

  const isValid = form.current?.checkValidity();

  const newTheme = React.useMemo(
    () =>
      ui.resolvedTheme === "light"
        ? buildLightTheme(customTheme)
        : buildDarkTheme(customTheme),
    [customTheme, ui.resolvedTheme]
  );

  return (
    <ThemeProvider theme={newTheme}>
      <Scene title={t("Details")} icon={<TeamIcon />}>
        <Heading>{t("Details")}</Heading>
        <Text as="p" type="secondary">
          <Trans>
            These settings affect the way that your workspace appears to
            everyone on the team.
          </Trans>
        </Text>

        <form onSubmit={handleSubmit} ref={form}>
          <Heading as="h2">{t("Display")}</Heading>
          <SettingRow
            label={t("Logo")}
            name="avatarUrl"
            description={t(
              "The logo is displayed at the top left of the application."
            )}
          >
            <ImageInput
              onSuccess={handleAvatarChange}
              onError={handleAvatarError}
              model={team}
              borderRadius={0}
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
              required
            />
          </SettingRow>
          <SettingRow
            label={t("Theme")}
            name="accent"
            description={
              <>
                {t("Customize the interface look and feel.")}{" "}
                {accent && (
                  <>
                    <ButtonLink
                      onClick={() => {
                        setAccent(null);
                        setAccentText(null);
                      }}
                    >
                      {t("Reset theme")}
                    </ButtonLink>
                  </>
                )}
              </>
            }
          >
            <InputColor
              id="accent"
              value={accent ?? theme.accent}
              label={t("Accent color")}
              onChange={setAccent}
              flex
            />
            <InputColor
              id="accentText"
              value={accentText ?? theme.accentText}
              label={t("Accent text color")}
              onChange={setAccentText}
              flex
            />
          </SettingRow>
          {team.avatarUrl && (
            <SettingRow
              name={TeamPreference.PublicBranding}
              label={t("Public branding")}
              description={t(
                "Show your team’s logo on public pages like login and shared documents."
              )}
            >
              <Switch
                id={TeamPreference.PublicBranding}
                name={TeamPreference.PublicBranding}
                checked={publicBranding}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setPublicBranding(event.target.checked)
                }
              />
            </SettingRow>
          )}
          <SettingRow
            border={false}
            label={t("Table of contents position")}
            name="tocPosition"
            description={t(
              "The side to display the table of contents in relation to the main content."
            )}
          >
            <InputSelectNew
              options={tocPositionOptions}
              value={tocPosition}
              onChange={handleTocPositionChange}
              ariaLabel={t("Table of contents position")}
              label={t("Table of contents position")}
              hideLabel
            />
          </SettingRow>

          <Heading as="h2">{t("Behavior")}</Heading>

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
              autoComplete="off"
              minLength={4}
              maxLength={32}
            />
          </SettingRow>
          <SettingRow
            border={false}
            label={t("Start view")}
            name="defaultCollectionId"
            description={t(
              "This is the screen that workspace members will first see when they sign in."
            )}
          >
            <DefaultCollectionInputSelect
              onSelectCollection={onSelectCollection}
              defaultCollectionId={defaultCollectionId}
            />
          </SettingRow>

          <ActionRow>
            <Button type="submit" disabled={team.isSaving || !isValid}>
              {team.isSaving ? `${t("Saving")}…` : t("Save")}
            </Button>
          </ActionRow>

          {can.delete && (
            <>
              <p>&nbsp;</p>

              <Heading as="h2">{t("Danger")}</Heading>
              <SettingRow
                name="delete"
                border={false}
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
            </>
          )}
        </form>
      </Scene>
    </ThemeProvider>
  );
}

export default observer(Details);
