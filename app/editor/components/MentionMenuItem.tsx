import * as React from "react";
import CommandMenuItem, {
  Props as CommandMenuItemProps,
} from "./CommandMenuItem";

type MentionMenuItemProps = Omit<CommandMenuItemProps, "shortcut" | "theme"> & {
  label: string;
};

export default function MentionMenuItem({
  label,
  ...rest
}: MentionMenuItemProps) {
  return <CommandMenuItem {...rest} title={label} />;
}
