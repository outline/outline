import { CopyIcon, ExpandedIcon } from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";
import { LANGUAGES } from "@shared/editor/extensions/Prism";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function codeMenuItems(
  state: EditorState,
  readOnly: boolean | undefined,
  dictionary: Dictionary
): MenuItem[] {
  if (readOnly) {
    return [];
  }
  const node = state.selection.$from.node();

  return [
    {
      name: "copyToClipboard",
      icon: <CopyIcon />,
      tooltip: dictionary.copy,
    },
    {
      name: "separator",
    },
    {
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
  ];
}
