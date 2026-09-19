import { isUUID } from "validator";
import { IconType } from "../types";
import { iconNames } from "./IconNames";

const outlineIconNames = new Set<string>(iconNames);

export const determineIconType = (
  icon?: string | null
): IconType | undefined => {
  if (!icon) {
    return;
  }
  return outlineIconNames.has(icon)
    ? IconType.SVG
    : isUUID(icon)
      ? IconType.Custom
      : IconType.Emoji;
};
