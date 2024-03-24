import { CopyIcon, ExpandedIcon } from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";
import { LANGUAGES, DIAGRAMS } from "@shared/editor/extensions/Prism";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function codeMenuItems(
  state: EditorState,
  readOnly: boolean | undefined,
  dictionary: Dictionary
): MenuItem[] {
  const node = state.selection.$from.node();
  const is_kroki = node.attrs.language === "kroki";

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
      visible: !readOnly && !is_kroki,
      name: "code_block",
      icon: <ExpandedIcon />,
      label: LANGUAGES[node.attrs.language ?? "none"],
      children: Object.entries(LANGUAGES).map(([value, label]) => ({
        name: "code_block",
        label,
        active: () => node.attrs.language === value,
        attrs: {
          language: value,
        },
      })),
    },
    {
      visible: !readOnly && is_kroki,
      name: "code_block",
      icon: <ExpandedIcon />,
      label: DIAGRAMS[node.attrs.diagram] ?? "WTF",
      children: Object.entries(DIAGRAMS).map(([value, label]) => ({
        name: "code_block",
        label,
        active: () => node.attrs.diagram === value,
        attrs: {
          language: "kroki",
          diagram: value,
        },
      })),
    },
  ];
}
