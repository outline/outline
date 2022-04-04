import { EmbedDescriptor, MenuItem } from "../types";

export default function filterExcessSeparators(
  items: (MenuItem | EmbedDescriptor)[]
): (MenuItem | EmbedDescriptor)[] {
  return items.reduce((acc, item, index) => {
    // trim separators from start / end
    if (item.name === "separator" && index === 0) {
      return acc;
    }
    if (item.name === "separator" && index === items.length - 1) {
      return acc;
    }

    // trim double separators looking behind
    const prev = items[index - 1];
    if (prev && prev.name === "separator" && item.name === "separator") {
      return acc;
    }

    // trim double separators looking ahead only if we're in the second to last
    // position and the last position is also a separator (special case)
    const next = items[index + 1];
    if (
      next &&
      next.name === "separator" &&
      item.name === "separator" &&
      index === items.length - 2
    ) {
      return acc;
    }

    // otherwise, continue
    return [...acc, item];
  }, []);
}
