import { DatabaseIcon, DocumentIcon, ShapesIcon } from "outline-icons";
import { cloneDeep } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Icon from "@shared/components/Icon";
import type { MenuItem } from "@shared/editor/types";
import { TeamPreference } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { TextHelper } from "@shared/utils/TextHelper";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import getMenuItems from "../menus/block";
import { useEditor } from "./EditorContext";
import type { Props as SuggestionsMenuProps } from "./SuggestionsMenu";
import SuggestionsMenu from "./SuggestionsMenu";
import SuggestionsMenuItem from "./SuggestionsMenuItem";

/**
 * Hook that returns a template menu item with children for inserting template
 * content into the editor, or undefined if no templates are available.
 */
function useTemplateMenuItem(): MenuItem | undefined {
  const { t } = useTranslation();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const { documents, templates: templatesStore } = useStores();
  const editor = useEditor();
  const documentId = editor.props.id;
  const document = documentId ? documents.get(documentId) : undefined;
  const collectionId = document?.collectionId;

  return useMemo(() => {
    if (!user) {
      return undefined;
    }

    const allTemplates = templatesStore.orderedData.filter(
      (template) => template.isActive
    );
    const hasTemplates = allTemplates.some(
      (template) =>
        template.isWorkspaceTemplate || template.collectionId === collectionId
    );

    if (!hasTemplates) {
      return undefined;
    }

    const toMenuItem = (template: (typeof allTemplates)[0]): MenuItem => ({
      name: "noop",
      title: TextHelper.replaceTemplateVariables(
        template.titleWithDefault,
        user
      ),
      icon: template.icon ? (
        <Icon
          value={template.icon}
          initial={template.initial}
          color={template.color ?? undefined}
        />
      ) : (
        <DocumentIcon />
      ),
      keywords: template.titleWithDefault,
      onClick: () => {
        const data = cloneDeep(template.data);
        ProsemirrorHelper.replaceTemplateVariables(data, user);
        editor.insertContent(data);
      },
    });

    const children = (): MenuItem[] => {
      const collectionTemplates = allTemplates.filter(
        (template) =>
          !template.isWorkspaceTemplate &&
          template.collectionId === collectionId
      );
      const workspaceTemplates = allTemplates.filter(
        (tmpl) => tmpl.isWorkspaceTemplate
      );

      const items: MenuItem[] = collectionTemplates.map(toMenuItem);

      if (collectionTemplates.length && workspaceTemplates.length) {
        items.push({ name: "separator" });
      }

      if (workspaceTemplates.length) {
        for (const template of workspaceTemplates) {
          items.push(toMenuItem(template));
        }
      }

      return items;
    };

    return {
      name: "noop",
      title: t("Templates"),
      icon: <ShapesIcon />,
      keywords: "template",
      children,
    } satisfies MenuItem;
  }, [user, templatesStore.orderedData, collectionId, editor, t]);
}

/**
 * Hook that returns a database menu item with children for inserting an
 * inline database block, or undefined when the feature is disabled or no
 * database collections exist.
 */
function useDatabaseMenuItem(): MenuItem | undefined {
  const { t } = useTranslation();
  const team = useCurrentTeam({ rejectOnEmpty: false });
  const { collections } = useStores();

  return useMemo(() => {
    if (!team?.getPreference(TeamPreference.DocumentDatabases)) {
      return undefined;
    }

    const databases = collections.orderedData.filter(
      (collection) => collection.isDatabase
    );
    if (databases.length === 0) {
      return undefined;
    }

    return {
      name: "noop",
      title: t("Database"),
      icon: <DatabaseIcon />,
      keywords: "database table rows",
      children: databases.map((collection) => ({
        name: "database",
        title: collection.name,
        icon: <DatabaseIcon />,
        keywords: collection.name,
        attrs: { collectionId: collection.id },
      })),
    } satisfies MenuItem;
  }, [team, collections.orderedData, t]);
}

type Props = Omit<SuggestionsMenuProps, "renderMenuItem" | "items"> &
  Required<Pick<SuggestionsMenuProps, "embeds">>;

function BlockMenu(props: Props) {
  const { t } = useTranslation();
  const { elementRef } = useEditor();
  const templateMenuItem = useTemplateMenuItem();
  const databaseMenuItem = useDatabaseMenuItem();

  const items = useMemo(() => {
    const baseItems = getMenuItems(t, elementRef);
    const extraItems = [templateMenuItem, databaseMenuItem].filter(
      (item): item is MenuItem => item !== undefined
    );

    if (extraItems.length === 0) {
      return baseItems;
    }

    return [...baseItems, { name: "separator" } as MenuItem, ...extraItems];
  }, [t, elementRef, templateMenuItem, databaseMenuItem]);

  const renderMenuItem = useCallback(
    (item, _index, options) => (
      <SuggestionsMenuItem
        {...options}
        icon={item.icon}
        title={item.title}
        shortcut={item.shortcut}
        disclosure={options.disclosure}
      />
    ),
    []
  );

  return (
    <SuggestionsMenu
      {...props}
      filterable
      trigger="/"
      renderMenuItem={renderMenuItem}
      items={items}
    />
  );
}

export default observer(BlockMenu);
