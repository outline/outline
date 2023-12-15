import { OpenIcon } from "outline-icons";
import * as React from "react";
import { DefaultTheme, ThemeProps } from "styled-components";
import { EmbedProps as Props } from "../embeds";
import Widget from "./Widget";

export default function DisabledEmbed(
  props: Omit<Props, "matches" | "attrs"> &
    ThemeProps<DefaultTheme> & {
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
      theme={props.theme}
    >
      <OpenIcon size={20} />
    </Widget>
  );
}
