import { GroupIcon } from "outline-icons";
import * as React from "react";
import { useTheme } from "styled-components";
import Squircle from "@shared/components/Squircle";
import Group from "~/models/Group";
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

export function GroupAvatar({
  color,
  backgroundColor,
  size = AvatarSize.Medium,
  className,
}: Props) {
  const theme = useTheme();
  return (
    <Squircle color={color ?? theme.text} size={size} className={className}>
      <GroupIcon
        color={backgroundColor ?? theme.background}
        size={size * 0.75}
      />
    </Squircle>
  );
}
