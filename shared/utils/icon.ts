import { IconType } from "../types";
import { IconLibrary } from "./IconLibrary";
import { isInternalUrl } from "./urls";

const outlineIconNames = new Set(Object.keys(IconLibrary.mapping));

export const determineIconType = (
  icon?: string | null
): IconType | undefined => {
  if (!icon) {
    return;
  }
  return outlineIconNames.has(icon)
    ? IconType.SVG
    : isInternalUrl(icon)
      ? IconType.Custom
      : IconType.Emoji;
};
