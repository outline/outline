import { TrashIcon } from "outline-icons";
import * as React from "react";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function tableMenuItems(dictionary: Dictionary): MenuItem[] {
  return [
    {
      name: "deleteTable",
      tooltip: dictionary.deleteTable,
      icon: <TrashIcon />,
    },
  ];
}
