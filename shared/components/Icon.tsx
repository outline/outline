import { observer } from "mobx-react";
import { getLuminance } from "polished";
import * as React from "react";
import styled from "styled-components";
import useStores from "../hooks/useStores";
import { IconType } from "../types";
import { IconLibrary } from "../utils/IconLibrary";
import { colorPalette } from "../utils/collections";
import { determineIconType } from "../utils/icon";
import EmojiIcon from "./EmojiIcon";
// import Logger from "~/utils/Logger";
import Flex from "./Flex";

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
    // Logger.warn("Failed to determine icon type", {
    //   icon,
    // });
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
    // Logger.warn("Failed to render icon", {
    //   icon,
    // });
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
    let color = inputColor ?? colorPalette[0];

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

export const IconTitleWrapper = styled(Flex)<{ dir?: string }>`
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 3px;
  height: 40px;
  width: 40px;

  // Always move above TOC
  z-index: 1;

  ${(props: { dir?: string }) =>
    props.dir === "rtl" ? "right: -44px" : "left: -44px"};
`;

export default Icon;
