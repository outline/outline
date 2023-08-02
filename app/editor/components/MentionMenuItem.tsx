import * as React from "react";
import SuggestionsMenuItem, {
  Props as SuggestionsMenuItemProps,
} from "./SuggestionsMenuItem";

type MentionMenuItemProps = Omit<
  SuggestionsMenuItemProps,
  "shortcut" | "theme"
> & {
  label: string;
};

export default function MentionMenuItem({
  label,
  ...rest
}: MentionMenuItemProps) {
  return <SuggestionsMenuItem {...rest} title={label} />;
}
