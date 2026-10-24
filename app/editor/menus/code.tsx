import { CopyIcon, EditIcon, ExpandedIcon, TextWrapIcon } from "outline-icons";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { NodeSelection } from "prosemirror-state";
import {
  pluginKey as diagramServicePluginKey,
  type DiagramServiceState,
} from "@shared/editor/extensions/DiagramService";
import {
  pluginKey as mermaidPluginKey,
  type MermaidState,
} from "@shared/editor/extensions/Mermaid";
import {
  getFrequentCodeLanguages,
  codeLanguages,
  getLabelForLanguage,
} from "@shared/editor/lib/code";
import { isCode, isMermaid } from "@shared/editor/lib/isCode";
import { t } from "i18next";
import type {
  MenuItem,
  NodeWithPos,
  SelectionContext,
} from "@shared/editor/types";
import { metaDisplay } from "@shared/utils/keyboard";

/**
 * Returns menu items for the code block selection toolbar.
 *
 * @param ctx - the current selection context.
 * @param codeBlock - the code block to act on, defaults to the selected one.
 * @returns an array of menu items.
 */
export default function codeMenuItems(
  ctx: SelectionContext,
  codeBlock?: NodeWithPos
): MenuItem[] {
  const { state, readOnly } = ctx;
  const { selection } = state;
  const { node, pos } =
    codeBlock ??
    (selection instanceof NodeSelection
      ? { node: selection.node, pos: selection.from }
      : { node: selection.$from.node(), pos: selection.$from.before() });

  const frequentLanguages = getFrequentCodeLanguages();

  const frequentLangMenuItems = frequentLanguages.map((value) => {
    const label = codeLanguages[value]?.label;
    return langToMenuItem({ node, value, label });
  });

  const remainingLangMenuItems = Object.entries(codeLanguages)
    .filter(
      ([value, item]) =>
        !item.alias &&
        !frequentLanguages.includes(value as keyof typeof codeLanguages)
    )
    .map(([value, item]) => langToMenuItem({ node, value, label: item.label }));

  const getLanguageMenuItems = () =>
    frequentLangMenuItems.length
      ? [
          ...frequentLangMenuItems,
          { name: "separator" },
          ...remainingLangMenuItems,
        ]
      : remainingLangMenuItems;

  const isEditingMermaid = !!(mermaidPluginKey.getState(state) as MermaidState)
    ?.editingId;
  const dsState = diagramServicePluginKey.getState(state) as DiagramServiceState;
  const isEditingDiagramService = !!dsState?.editingId;
  const isEditingDiagram = isEditingMermaid || isEditingDiagramService;

  const nodePos =
    state.selection instanceof NodeSelection ? state.selection.from : undefined;
  const isDiagramServiceNode =
    nodePos !== undefined &&
    isCode(node) &&
    (dsState?.decorationSet.find(nodePos, nodePos + node.nodeSize) ?? []).some(
      (d) => !!d.spec.diagramId
    );

  return [
    {
      name: "copyToClipboard",
      icon: <CopyIcon />,
      label: readOnly
        ? getLabelForLanguage(node.attrs.language ?? "none")
        : undefined,
      tooltip: t("Copy"),
      attrs: { pos },
    },
    {
      name: "separator",
    },
    {
      name: "edit_mermaid",
      icon: <EditIcon />,
      tooltip: t("Edit diagram"),
      shortcut: `${metaDisplay} Enter`,
      visible:
        (isMermaid(node) || isDiagramServiceNode) &&
        !isEditingDiagram &&
        !readOnly,
    },
    {
      name: "separator",
    },
    {
      name: "toggleCodeBlockWrap",
      icon: <TextWrapIcon />,
      tooltip: t("Wrap text"),
      active: () => node.attrs.wrap,
      visible:
        !readOnly &&
        ((!isMermaid(node) && !isDiagramServiceNode) || isEditingDiagram),
    },
    {
      name: "separator",
    },
    {
      name: "code_block",
      label: getLabelForLanguage(node.attrs.language ?? "none"),
      icon: <ExpandedIcon />,
      children: getLanguageMenuItems(),
      visible: !readOnly,
    },
  ];
}

const langToMenuItem = ({
  node,
  value,
  label,
}: {
  node: ProseMirrorNode;
  value: string;
  label: string;
}): MenuItem => ({
  name: "code_block",
  label,
  active: () => (node.attrs.language ?? "none") === value,
  attrs: {
    language: value,
  },
});
