import { observer } from "mobx-react";
import { GroupIcon } from "outline-icons";
import Icon from "@shared/components/Icon";
import type Group from "~/models/Group";
import useContrastColor from "@shared/hooks/useContrastColor";

type Props = {
  /** The group to show an icon for. */
  group: Pick<Group, "icon" | "color" | "initial">;
  /** The size of the icon, 24px is default to match standard icons. */
  size?: number;
  /** The color of the icon, defaults to the group color. */
  color?: string;
  className?: string;
};

/**
 * Renders the icon chosen for a group, or the default group icon.
 */
export const ResolvedGroupIcon = observer(function ResolvedGroupIcon_({
  group,
  color,
  size,
  className,
}: Props) {
  const contrastColor = useContrastColor();

  if (!group.icon) {
    return (
      <GroupIcon
        color={color ?? contrastColor(group.color)}
        size={size}
        className={className}
      />
    );
  }

  return (
    <Icon
      value={group.icon}
      color={color ?? group.color ?? undefined}
      size={size}
      initial={group.initial}
      className={className}
      forceColor={!!color}
    />
  );
});
