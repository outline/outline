import { getLuminance } from "polished";
import * as React from "react";
import { randomElement } from "@shared/random";
import { IconType } from "@shared/types";
import { IconLibrary } from "@shared/utils/IconLibrary";
import { colorPalette } from "@shared/utils/collections";
import { determineIconType } from "@shared/utils/icon";
import EmojiIcon from "~/components/Icons/EmojiIcon";
import useStores from "~/hooks/useStores";
import Logger from "~/utils/Logger";

type IconProps = {
  value: string;
  color?: string;
  size?: number;
  initial?: string;
  className?: string;
};

const Icon = ({
  value: icon,
  color,
  size = 24,
  initial,
  className,
}: IconProps) => {
  const iconType = determineIconType(icon);

  if (!iconType) {
    Logger.warn("Failed to determine icon type", {
      icon,
    });
    return null;
  }

  try {
    if (iconType === IconType.Outline) {
      return (
        <OutlineIcon
          value={icon}
          color={color}
          size={size}
          initial={initial}
          className={className}
        />
      );
    }

    return <EmojiIcon emoji={icon} size={size} className={className} />;
  } catch (err) {
    Logger.warn("Failed to render icon", {
      icon,
    });
  }

  return null;
};

type OutlineIconProps = {
  value: string;
  color?: string;
  size?: number;
  initial?: string;
  className?: string;
};

const OutlineIcon = ({
  value: icon,
  color: inputColor,
  initial,
  size,
  className,
}: OutlineIconProps) => {
  const { ui } = useStores();

  let color = inputColor ?? randomElement(colorPalette);

  // If the chosen icon color is very dark then we invert it in dark mode
  // otherwise it will be impossible to see against the dark background.
  if (!inputColor && ui.resolvedTheme === "dark" && color !== "currentColor") {
    color = getLuminance(color) > 0.09 ? color : "currentColor";
  }

  const Component = IconLibrary.getComponent(icon);

  return (
    <Component color={color} size={size} className={className}>
      {initial}
    </Component>
  );
};

export default Icon;
