import { TrashIcon } from "outline-icons";
import { Dictionary } from "../hooks/useDictionary";
import { MenuItem } from "../types";

export default function tableMenuItems(dictionary: Dictionary): MenuItem[] {
  return [
    {
      name: "deleteTable",
      tooltip: dictionary.deleteTable,
      icon: TrashIcon,
      active: () => false,
    },
  ];
}
