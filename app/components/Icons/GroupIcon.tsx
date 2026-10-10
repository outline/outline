import { observer } from "mobx-react";
import { GroupIcon } from "outline-icons";
import { getLuminance } from "polished";
import Icon from "@shared/components/Icon";
import type Group from "~/models/Group";
import useStores from "~/hooks/useStores";

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
function ResolvedGroupIcon({ group, color, size, className }: Props) {
  const { ui } = useStores();

  if (!group.icon) {
    // Very dark colors are not visible against the dark theme background.
    const groupColor =
      group.color &&
      !(ui.resolvedTheme === "dark" && getLuminance(group.color) <= 0.09)
        ? group.color
        : "currentColor";

    return (
      <GroupIcon
        color={color ?? groupColor}
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
}

export default observer(ResolvedGroupIcon);
