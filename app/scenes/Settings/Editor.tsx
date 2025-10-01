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
  const [newIconPackName, setNewIconPackName] = React.useState("");
  const [newIconPackUrl, setNewIconPackUrl] = React.useState("");
  const [isAddingIconPack, setIsAddingIconPack] = React.useState(false);

  const libraries = React.useMemo(
    () => team.getPreference(TeamPreference.ExcalidrawLibraries) || [],
    [team, team.preferences]
  );

  const iconPacks = React.useMemo(
    () => team.getPreference(TeamPreference.MermaidIconPacks) || [],
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
      } catch (_error) {
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
      } catch (_error) {
        toast.error(t("Failed to remove library"));
      }
    },
    [team, t]
  );

  const handleAddIconPack = React.useCallback(
    async (name: string, url: string) => {
      if (!name.trim() || !url.trim()) {
        return;
      }

      const trimmedName = name.trim();
      const trimmedUrl = url.trim();

      // Basic validation for URL
      if (!trimmedUrl.endsWith(".json") && !trimmedUrl.startsWith("http")) {
        toast.error(t("Please enter a valid URL ending with .json"));
        return;
      }

      const currentIconPacks = team.getPreference(TeamPreference.MermaidIconPacks) || [];

      if (currentIconPacks.some((pack) => pack.name === trimmedName)) {
        toast.error(t("An icon pack with this name already exists"));
        return;
      }

      setIsAddingIconPack(true);
      try {
        team.setPreference(TeamPreference.MermaidIconPacks, [
          ...currentIconPacks,
          { name: trimmedName, url: trimmedUrl },
        ]);
        await team.save();
        setNewIconPackName("");
        setNewIconPackUrl("");
        toast.success(t("Icon pack added"));
      } catch (_error) {
        toast.error(t("Failed to add icon pack"));
      } finally {
        setIsAddingIconPack(false);
      }
    },
    [team, t]
  );

  const handleRemoveIconPack = React.useCallback(
    async (nameToRemove: string) => {
      const currentIconPacks = team.getPreference(TeamPreference.MermaidIconPacks) || [];
      team.setPreference(
        TeamPreference.MermaidIconPacks,
        currentIconPacks.filter((pack) => pack.name !== nameToRemove)
      );

      try {
        await team.save();
        toast.success(t("Icon pack removed"));
      } catch (_error) {
        toast.error(t("Failed to remove icon pack"));
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

      <Heading as="h2">{t("Mermaid Icon Packs")}</Heading>
      <Text as="p" type="secondary">
        {t(
          "Configure which icon packs are available in Mermaid diagrams. Add icon packs with a name and URL to iconify JSON files."
        )}
      </Text>

      <Flex column gap={8} style={{ marginTop: 16 }}>
        {iconPacks.length > 0 && (
          <Flex column gap={4}>
            {iconPacks.map((pack) => (
              <Flex key={pack.name} gap={8} align="center">
                <Input value={pack.name} readOnly style={{ maxWidth: 200 }} margin={0} />
                <Input value={pack.url} readOnly flex margin={0} />
                <Button
                  onClick={() => handleRemoveIconPack(pack.name)}
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
            placeholder={t("Pack name (e.g. logos)")}
            value={newIconPackName}
            onChange={(e) => setNewIconPackName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newIconPackName.trim() && newIconPackUrl.trim()) {
                e.preventDefault();
                handleAddIconPack(newIconPackName, newIconPackUrl);
              }
            }}
            style={{ maxWidth: 200 }}
            disabled={isAddingIconPack}
            margin={0}
          />
          <Input
            placeholder={t("https://unpkg.com/@iconify-json/logos@1/icons.json")}
            value={newIconPackUrl}
            onChange={(e) => setNewIconPackUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newIconPackName.trim() && newIconPackUrl.trim()) {
                e.preventDefault();
                handleAddIconPack(newIconPackName, newIconPackUrl);
              }
            }}
            flex
            disabled={isAddingIconPack}
            margin={0}
          />
          <Button
            onClick={() => handleAddIconPack(newIconPackName, newIconPackUrl)}
            disabled={!newIconPackName.trim() || !newIconPackUrl.trim() || isAddingIconPack}
            icon={<PlusIcon />}
          >
            {t("Add")}
          </Button>
        </Flex>

        <Text as="p" type="secondary" size="small">
          <Trans>
            You can use iconify JSON files from{" "}
            <code>https://unpkg.com/@iconify-json/</code>. Example:{" "}
            <code>https://unpkg.com/@iconify-json/logos@1/icons.json</code>
          </Trans>
        </Text>
      </Flex>
    </Scene>
  );
}

export default observer(Editor);