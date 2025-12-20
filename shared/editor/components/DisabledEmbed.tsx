import { OpenIcon } from "outline-icons";
import { EmbedProps as Props } from "../embeds";
import Widget from "./Widget";

export default function DisabledEmbed(
  props: Omit<Props, "matches" | "attrs"> & {
    href: string;
  }
) {
  return (
    <Widget
      title={props.embed.title}
      href={props.href}
      icon={props.embed.icon}
      context={props.href.replace(/^https?:\/\//, "")}
      isSelected={props.isSelected}
    >
      <OpenIcon size={20} />
    </Widget>
  );
}
