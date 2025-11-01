import { CopyIcon, ExpandedIcon } from "outline-icons";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import {
  getFrequentCodeLanguages,
  codeLanguages,
  getLabelForLanguage,
} from "@shared/editor/lib/code";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function codeMenuItems(
  state: EditorState,
  readOnly: boolean | undefined,
  dictionary: Dictionary
): MenuItem[] {
  const node = state.selection.$from.node();

  const frequentLanguages = getFrequentCodeLanguages();

  const frequentLangMenuItems = frequentLanguages.map((value) => {
    const label = codeLanguages[value]?.label;
    return langToMenuItem({ node, value, label });
  });

  const remainingLangMenuItems = Object.entries(codeLanguages)
    .filter(
      ([value]) =>
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

  return [
    {
      name: "copyToClipboard",
      icon: <CopyIcon />,
      label: readOnly
        ? getLabelForLanguage(node.attrs.language ?? "none")
        : undefined,
      tooltip: dictionary.copy,
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
  active: () => node.attrs.language === value,
  attrs: {
    language: value,
  },
});
