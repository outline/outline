import { observer } from "mobx-react";
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

export type Props = {
  /** The icon to render */
  value: string;
  /** The color of the icon */
  color?: string;
  /** The size of the icon */
  size?: number;
  /** The initial to display if the icon is a letter icon */
  initial?: string;
  /** Optional additional class name */
  className?: string;
  /**
   * Ensure the color does not change in response to theme and contrast. Should only be
   * used in color picker UI.
   */
  forceColor?: boolean;
};

const Icon = ({
  value: icon,
  color,
  size = 24,
  initial,
  forceColor,
  className,
}: Props) => {
  const iconType = determineIconType(icon);

  if (!iconType) {
    Logger.warn("Failed to determine icon type", {
      icon,
    });
    return null;
  }

  try {
    if (iconType === IconType.SVG) {
      return (
        <SVGIcon
          value={icon}
          color={color}
          size={size}
          initial={initial}
          className={className}
          forceColor={forceColor}
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

const SVGIcon = observer(
  ({
    value: icon,
    color: inputColor,
    initial,
    size,
    className,
    forceColor,
  }: Props) => {
    const { ui } = useStores();

    let color = inputColor ?? randomElement(colorPalette);

    // If the chosen icon color is very dark then we invert it in dark mode
    if (!forceColor) {
      if (ui.resolvedTheme === "dark" && color !== "currentColor") {
        color = getLuminance(color) > 0.09 ? color : "currentColor";
      }

      // If the chosen icon color is very light then we invert it in light mode
      if (ui.resolvedTheme === "light" && color !== "currentColor") {
        color = getLuminance(color) < 0.9 ? color : "currentColor";
      }
    }

    const Component = IconLibrary.getComponent(icon);

    return (
      <Component color={color} size={size} className={className}>
        {initial}
      </Component>
    );
  }
);

export default Icon;
