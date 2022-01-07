import { TrashIcon } from "outline-icons";
import baseDictionary from "../dictionary";
import { MenuItem } from "../types";

export default function tableMenuItems(
  dictionary: typeof baseDictionary
): MenuItem[] {
  return [
    {
      name: "deleteTable",
      tooltip: dictionary.deleteTable,
      icon: TrashIcon,
      active: () => false,
    },
  ];
}
