import { DocumentIcon } from "outline-icons";
import cloneDeep from "lodash/cloneDeep";
import { Node } from "prosemirror-model";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Icon from "@shared/components/Icon";
import type { MenuItem } from "@shared/editor/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { TextHelper } from "@shared/utils/TextHelper";
import useCurrentUser from "~/hooks/useCurrentUser";
import useDictionary from "~/hooks/useDictionary";
import useStores from "~/hooks/useStores";
import getMenuItems from "../menus/block";
import { useEditor } from "./EditorContext";
import type { Props as SuggestionsMenuProps } from "./SuggestionsMenu";
import SuggestionsMenu from "./SuggestionsMenu";
import SuggestionsMenuItem from "./SuggestionsMenuItem";

type Props = Omit<SuggestionsMenuProps, "renderMenuItem" | "items"> &
  Required<Pick<SuggestionsMenuProps, "embeds">>;

function BlockMenu(props: Props) {
  const dictionary = useDictionary();
  const { t } = useTranslation();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const { documents, templates: templatesStore } = useStores();
  const { elementRef, view, schema, props: editorProps } = useEditor();
  const documentId = editorProps.id;
  const document = documentId ? documents.get(documentId) : undefined;
  const collectionId = document?.collectionId;

  const items = useMemo(() => {
    const baseItems = getMenuItems(dictionary, elementRef);

    if (!user) {
      return baseItems;
    }

    const templateChildren = (): MenuItem[] => {
      const allTemplates = templatesStore.orderedData.filter(
        (template) => template.isActive
      );

      const collectionTemplates = allTemplates.filter(
        (template) =>
          !template.isWorkspaceTemplate &&
          template.collectionId === collectionId
      );

      const workspaceTemplates = allTemplates.filter(
        (tmpl) => tmpl.isWorkspaceTemplate
      );

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
          const doc = Node.fromJSON(schema, data);

          const { $from } = view.state.selection;
          const start = $from.before($from.depth);
          const end = $from.after($from.depth);
          view.dispatch(
            view.state.tr.replaceWith(start, end, doc.content)
          );
        },
      });

      const items: MenuItem[] = [];

      for (const template of collectionTemplates) {
        items.push(toMenuItem(template));
      }

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

    const allTemplates = templatesStore.orderedData.filter(
      (template) => template.isActive
    );
    const hasTemplates = allTemplates.some(
      (template) =>
        template.isWorkspaceTemplate ||
        template.collectionId === collectionId
    );

    if (!hasTemplates) {
      return baseItems;
    }

    return [
      ...baseItems,
      { name: "separator" },
      {
        name: "noop",
        title: t("Templates"),
        icon: <DocumentIcon />,
        keywords: "template",
        children: templateChildren,
      } satisfies MenuItem,
    ];
  }, [
    dictionary,
    elementRef,
    user,
    templatesStore.orderedData,
    collectionId,
    schema,
    view,
    t,
  ]);

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

export default BlockMenu;
