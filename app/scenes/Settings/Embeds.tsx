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

/** List of embed providers available for configuration. */
const providers = embeds.filter(
  (e) => e.title !== "Embed" && e.visible !== false
);

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
    async (title: string, enabled: boolean) => {
      const disabledEmbeds =
        (team.getPreference(TeamPreference.DisabledEmbeds) as string[]) || [];

      const updated = enabled
        ? disabledEmbeds.filter((t) => t !== title)
        : [...disabledEmbeds, title];

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
    <IntegrationScene
      title={t("Embeds")}
      icon={<BrowserIcon />}
    >
      <Heading>{t("Embeds")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Configure which embed providers are available in the editor. Existing
          embeds in documents will continue to display regardless of these
          settings.
        </Trans>
      </Text>

      <SettingRow
        label={t("Rich service embeds")}
        name="documentEmbeds"
        description={t(
          "Links to supported services are shown as rich embeds within your documents"
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
          {providers.map((embed) => {
            const enabled = !disabledEmbeds.includes(embed.title);
            return (
              <SettingRow
                key={embed.title}
                label={embed.title}
                name={embed.title}
                description={embed.keywords}
              >
                <Switch
                  id={embed.title}
                  checked={enabled}
                  onChange={(checked: boolean) =>
                    handleToggleEmbed(embed.title, checked)
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
