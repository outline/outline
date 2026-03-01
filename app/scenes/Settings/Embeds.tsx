import debounce from "lodash/debounce";
import { observer } from "mobx-react";
import { BrowserIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import embeds from "@shared/editor/embeds";
import { TeamPreference } from "@shared/types";
import Heading from "~/components/Heading";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { IntegrationScene } from "./components/IntegrationScene";
import SettingRow from "./components/SettingRow";
import { HStack } from "~/components/primitives/HStack";

/** List of embed providers available for configuration. */
const providers = embeds.filter((e) => e.id !== "embed");

function Embeds() {
  const team = useCurrentTeam();
  const { t } = useTranslation();

  const showSuccessMessage = React.useMemo(
    () =>
      debounce(() => {
        toast.success(t("Settings saved"));
      }, 250),
    [t]
  );

  const saveData = React.useCallback(
    async (newData: Record<string, unknown>) => {
      try {
        await team.save(newData);
        showSuccessMessage();
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [team, showSuccessMessage]
  );

  const handleDocumentEmbedsChange = React.useCallback(
    async (checked: boolean) => {
      await saveData({ documentEmbeds: checked });
    },
    [saveData]
  );

  const handleToggleEmbed = React.useCallback(
    async (id: string, enabled: boolean) => {
      const disabledEmbeds =
        (team.getPreference(TeamPreference.DisabledEmbeds) as string[]) || [];

      const updated = enabled
        ? disabledEmbeds.filter((t) => t !== id)
        : [...disabledEmbeds, id];

      team.setPreference(TeamPreference.DisabledEmbeds, updated);
      await saveData({
        preferences: { ...team.preferences },
      });
    },
    [team, saveData]
  );

  const handleToggleAllEmbeds = React.useCallback(
    async (enabled: boolean) => {
      const updated = enabled ? [] : providers.map((e) => e.id);

      team.setPreference(TeamPreference.DisabledEmbeds, updated);
      await saveData({
        preferences: { ...team.preferences },
      });
    },
    [team, saveData]
  );

  const disabledEmbeds =
    (team.getPreference(TeamPreference.DisabledEmbeds) as string[]) || [];

  return (
    <IntegrationScene title={t("Embeds")} icon={<BrowserIcon />}>
      <Heading>{t("Embeds")}</Heading>

      <SettingRow
        label={t("Enabled")}
        name="documentEmbeds"
        description={t(
          "Allow supported providers to be inserted as interactive embeds in documents."
        )}
      >
        <Switch
          id="documentEmbeds"
          checked={team.documentEmbeds}
          onChange={handleDocumentEmbedsChange}
        />
      </SettingRow>

      {team.documentEmbeds && (
        <>
          <Heading as="h2">{t("Providers")}</Heading>
          <Text as="p" type="secondary">
            <Trans>
              Enabled providers will appear in the editor slash menu and embed
              automatically when a compatible link is pasted. Existing embeds in
              documents will continue to display regardless of these settings.
            </Trans>
          </Text>
          <SettingRow
            name="allEmbeds"
            label={t("All providers")}
            compact
            border={false}
          >
            <Switch
              id="allEmbeds"
              checked={disabledEmbeds.length === 0}
              onChange={handleToggleAllEmbeds}
            />
          </SettingRow>
          {providers.map((embed) => {
            const enabled = !disabledEmbeds.includes(embed.id);
            return (
              <SettingRow
                key={embed.id}
                name={embed.title}
                label={
                  <HStack
                    style={{ filter: enabled ? "none" : "grayscale(100%)" }}
                  >
                    {embed.icon}
                    <Text type={enabled ? undefined : "tertiary"}>
                      {embed.title}
                    </Text>
                  </HStack>
                }
                compact
              >
                <Switch
                  id={embed.id}
                  checked={enabled}
                  onChange={(checked: boolean) =>
                    handleToggleEmbed(embed.id, checked)
                  }
                />
              </SettingRow>
            );
          })}
        </>
      )}
    </IntegrationScene>
  );
}

export default observer(Embeds);
