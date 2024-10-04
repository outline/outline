import { action } from "mobx";
import * as React from "react";
import { WidgetProps } from "@shared/editor/lib/Extension";
import Suggestion from "~/editor/extensions/Suggestion";
import EmojiMenu from "../components/EmojiMenu";

/**
 * Languages using the colon character with a space in front in standard
 * punctuation. In this case the trigger is only matched once there is additional
 * text after the colon.
 */
const languagesUsingColon = ["fr"];

export default class EmojiMenuExtension extends Suggestion {
  get defaultOptions() {
    const languageIsUsingColon =
      typeof window === "undefined"
        ? false
        : languagesUsingColon.includes(window.navigator.language.slice(0, 2));

    return {
      openRegex: new RegExp(
        `(?:^|\\s|\\():([0-9a-zA-Z_+-]+)${languageIsUsingColon ? "" : "?"}$`
      ),
      closeRegex:
        /(?:^|\s|\():(([0-9a-zA-Z_+-]*\s+)|(\s+[0-9a-zA-Z_+-]+)|[^0-9a-zA-Z_+-]+)$/,
    };
  }

  get name() {
    return "emoji-menu";
  }

  widget = ({ rtl }: WidgetProps) => (
    <EmojiMenu
      rtl={rtl}
      isActive={this.state.open}
      search={this.state.query}
      onClose={action(() => {
        this.state.open = false;
      })}
    />
  );
}
