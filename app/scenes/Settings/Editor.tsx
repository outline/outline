import { observer } from "mobx-react";
import { EditIcon, PlusIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TeamPreference } from "@shared/types";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";

function Editor() {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const [newLibraryUrl, setNewLibraryUrl] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);

  const libraries = React.useMemo(
    () => team.getPreference(TeamPreference.ExcalidrawLibraries) || [],
    [team, team.preferences]
  );

  const handleAddLibrary = React.useCallback(
    async (url: string) => {
      if (!url.trim()) {
        return;
      }

      const trimmedUrl = url.trim();

      // Basic validation for URL or filename
      if (!trimmedUrl.endsWith(".excalidrawlib") && !trimmedUrl.startsWith("http")) {
        toast.error(t("Please enter a valid URL or filename ending with .excalidrawlib"));
        return;
      }

      const currentLibraries = team.getPreference(TeamPreference.ExcalidrawLibraries) || [];

      if (currentLibraries.includes(trimmedUrl)) {
        toast.error(t("This library is already added"));
        return;
      }

      setIsAdding(true);
      try {
        team.setPreference(TeamPreference.ExcalidrawLibraries, [
          ...currentLibraries,
          trimmedUrl,
        ]);
        await team.save();
        setNewLibraryUrl("");
        toast.success(t("Library added"));
      } catch (error) {
        toast.error(t("Failed to add library"));
      } finally {
        setIsAdding(false);
      }
    },
    [team, t]
  );

  const handleRemoveLibrary = React.useCallback(
    async (urlToRemove: string) => {
      const currentLibraries = team.getPreference(TeamPreference.ExcalidrawLibraries) || [];
      team.setPreference(
        TeamPreference.ExcalidrawLibraries,
        currentLibraries.filter((url) => url !== urlToRemove)
      );

      try {
        await team.save();
        toast.success(t("Library removed"));
      } catch (error) {
        toast.error(t("Failed to remove library"));
      }
    },
    [team, t]
  );

  return (
    <Scene title={t("Editor")} icon={<EditIcon />}>
      <Heading>{t("Editor")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Configure editor settings and preferences for the workspace.
        </Trans>
      </Text>

      <Heading as="h2">{t("Excalidraw Libraries")}</Heading>
      <Text as="p" type="secondary">
        {t(
          "Configure which Excalidraw libraries are available in the drawing editor. You can add URLs to remote .excalidrawlib files or filenames for local libraries in the public/excalidraw/libraries folder."
        )}
      </Text>

      <Flex column gap={8} style={{ marginTop: 16 }}>
        {libraries.length > 0 && (
          <Flex column gap={4}>
            {libraries.map((url) => (
              <Flex key={url} gap={8} align="center">
                <Input value={url} readOnly flex margin={0} />
                <Button
                  onClick={() => handleRemoveLibrary(url)}
                  icon={<TrashIcon />}
                  neutral
                  borderOnHover
                >
                  {t("Remove")}
                </Button>
              </Flex>
            ))}
          </Flex>
        )}

        <Flex gap={8} align="center">
          <Input
            placeholder={t("https://example.com/library.excalidrawlib or filename.excalidrawlib")}
            value={newLibraryUrl}
            onChange={(e) => setNewLibraryUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddLibrary(newLibraryUrl);
              }
            }}
            flex
            disabled={isAdding}
            margin={0}
          />
          <Button
            onClick={() => handleAddLibrary(newLibraryUrl)}
            disabled={!newLibraryUrl.trim() || isAdding}
            icon={<PlusIcon />}
          >
            {t("Add")}
          </Button>
        </Flex>

        <Text as="p" type="secondary" size="small">
          <Trans>
            Available local libraries can be placed in the{" "}
            <code>public/excalidraw/libraries/</code> folder. Remote URLs must
            point to valid .excalidrawlib files.
          </Trans>
        </Text>
      </Flex>
    </Scene>
  );
}

export default observer(Editor);