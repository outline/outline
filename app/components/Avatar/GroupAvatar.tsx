import { observer } from "mobx-react";
import { GroupIcon } from "outline-icons";
import { useTheme } from "styled-components";
import Icon from "@shared/components/Icon";
import Squircle from "@shared/components/Squircle";
import { IconType } from "@shared/types";
import useContrastColor from "@shared/hooks/useContrastColor";
import { determineIconType } from "@shared/utils/icon";
import type Group from "~/models/Group";
import { AvatarSize } from "../Avatar/Avatar";

type Props = {
  /** The group to show an avatar for */
  group: Group;
  /** The size of the icon, 24px is default to match standard avatars */
  size?: number;
  /** The color of the avatar */
  color?: string;
  /** The background color of the avatar */
  backgroundColor?: string;
  className?: string;
};

export const GroupAvatar = observer(function GroupAvatar_({
  group,
  color,
  backgroundColor,
  size = AvatarSize.Medium,
  className,
}: Props) {
  const theme = useTheme();
  const contrastColor = useContrastColor();
  const iconType = determineIconType(group.icon);
  const iconSize = size * 0.75;

  if (group.icon && iconType !== IconType.SVG) {
    return (
      <Squircle
        color={color ?? theme.backgroundSecondary}
        size={size}
        className={className}
      >
        <Icon value={group.icon} size={iconSize} initial={group.initial} />
      </Squircle>
    );
  }

  const groupColor = contrastColor(group.color, theme.text);
  const foreground = backgroundColor ?? theme.background;

  return (
    <Squircle color={color ?? groupColor} size={size} className={className}>
      {group.icon ? (
        <Icon
          value={group.icon}
          color={foreground}
          size={iconSize}
          initial={group.initial}
          forceColor
        />
      ) : (
        <GroupIcon data-fixed-color color={foreground} size={iconSize} />
      )}
    </Squircle>
  );
});
