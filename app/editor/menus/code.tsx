import { CopyIcon, ExpandedIcon } from "outline-icons";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import * as React from "react";
import { LANGUAGES } from "@shared/editor/extensions/Prism";
import { getFrequentCodeLanguages } from "@shared/editor/lib/code";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function codeMenuItems(
  state: EditorState,
  readOnly: boolean | undefined,
  dictionary: Dictionary
): MenuItem[] {
  const node = state.selection.$from.node();

  const allLanguages = Object.entries(LANGUAGES) as [
    keyof typeof LANGUAGES,
    string
  ][];
  const frequentLanguages = getFrequentCodeLanguages();

  const frequentLangMenuItems = frequentLanguages.map((value) => {
    const label = LANGUAGES[value];
    return langToMenuItem({ node, value, label });
  });

  const remainingLangMenuItems = allLanguages
    .filter(([value]) => !frequentLanguages.includes(value))
    .map(([value, label]) => langToMenuItem({ node, value, label }));

  const languageMenuItems = frequentLangMenuItems.length
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
      label: readOnly ? dictionary.copy : undefined,
      tooltip: dictionary.copy,
    },
    {
      name: "separator",
      visible: !readOnly,
    },
    {
      visible: !readOnly,
      name: "code_block",
      icon: <ExpandedIcon />,
      // @ts-expect-error We have a fallback for incorrect mapping
      label: LANGUAGES[node.attrs.language ?? "none"],
      children: languageMenuItems,
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
