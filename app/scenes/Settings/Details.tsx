import { isHexColor } from "class-validator";
import { pickBy } from "lodash";
import { observer } from "mobx-react";
import { TeamIcon } from "outline-icons";
import { useRef, useState } from "react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { ThemeProvider, useTheme } from "styled-components";
import { buildDarkTheme, buildLightTheme } from "@shared/styles/theme";
import { CustomTheme, TeamPreference } from "@shared/types";
import { getBaseDomain } from "@shared/utils/domains";
import Button from "~/components/Button";
import ButtonLink from "~/components/ButtonLink";
import DefaultCollectionInputSelect from "~/components/DefaultCollectionInputSelect";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import InputColor from "~/components/InputColor";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import isCloudHosted from "~/utils/isCloudHosted";
import ImageInput from "./components/ImageInput";
import SettingRow from "./components/SettingRow";

function Details() {
  const { auth, ui } = useStores();
  const { showToast } = useToasts();
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const theme = useTheme();
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

  const handleSubmit = React.useCallback(
    async (event?: React.SyntheticEvent) => {
      if (event) {
        event.preventDefault();
      }

      try {
        await auth.updateTeam({
          name,
          subdomain,
          defaultCollectionId,
          preferences: {
            ...team.preferences,
            publicBranding,
            customTheme,
          },
        });
        showToast(t("Settings saved"), {
          type: "success",
        });
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      }
    },
    [
      auth,
      name,
      subdomain,
      defaultCollectionId,
      team.preferences,
      publicBranding,
      customTheme,
      showToast,
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

  const handleAvatarUpload = async (avatarUrl: string) => {
    await auth.updateTeam({
      avatarUrl,
    });
    showToast(t("Logo updated"), {
      type: "success",
    });
  };

  const handleAvatarError = React.useCallback(
    (error: string | null | undefined) => {
      showToast(error || t("Unable to upload new logo"));
    },
    [showToast, t]
  );

  const onSelectCollection = React.useCallback(async (value: string) => {
    const defaultCollectionId = value === "home" ? null : value;
    setDefaultCollectionId(defaultCollectionId);
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
        <Text type="secondary">
          <Trans>
            These settings affect the way that your knowledge base appears to
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
              onSuccess={handleAvatarUpload}
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
            border={false}
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
                    .
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

          <Heading as="h2">{t("Behavior")}</Heading>

          <SettingRow
            visible={env.SUBDOMAINS_ENABLED && isCloudHosted}
            label={t("Subdomain")}
            name="subdomain"
            description={
              subdomain ? (
                <>
                  <Trans>Your knowledge base will be accessible at</Trans>{" "}
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
              id="defaultCollectionId"
              onSelectCollection={onSelectCollection}
              defaultCollectionId={defaultCollectionId}
            />
          </SettingRow>

          <Button type="submit" disabled={auth.isSaving || !isValid}>
            {auth.isSaving ? `${t("Saving")}…` : t("Save")}
          </Button>
        </form>
      </Scene>
    </ThemeProvider>
  );
}

export default observer(Details);
