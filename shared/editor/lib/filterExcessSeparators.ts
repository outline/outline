import { EmbedDescriptor } from "../embeds";
import { MenuItem } from "../types";

type Item = MenuItem | EmbedDescriptor;

export default function filterExcessSeparators(items: Item[]): Item[] {
  return items
    .reduce((acc, item) => {
      // trim separator if the previous item was a separator
      if (
        item.name === "separator" &&
        acc[acc.length - 1]?.name === "separator"
      ) {
        return acc;
      }
      return [...acc, item];
    }, [] as Item[])
    .filter((item, index, arr) => {
      if (
        item.name === "separator" &&
        (index === 0 || index === arr.length - 1)
      ) {
        return false;
      }
      return true;
    });
}
