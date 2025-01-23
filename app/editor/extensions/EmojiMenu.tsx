import { action } from "mobx";
import * as React from "react";
import { WidgetProps } from "@shared/editor/lib/Extension";
import { isBrowser } from "@shared/utils/browser";
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
    const languageIsUsingColon = isBrowser
      ? languagesUsingColon.includes(window.navigator.language.slice(0, 2))
      : false;

    return {
      trigger: ":",
      allowSpaces: false,
      requireSearchTerm: languageIsUsingColon,
      enabledInCode: false,
    };
  }

  get name() {
    return "emoji-menu";
  }

  widget = ({ rtl }: WidgetProps) => (
    <EmojiMenu
      rtl={rtl}
      trigger={this.options.trigger}
      isActive={this.state.open}
      search={this.state.query}
      onClose={action(() => {
        this.state.open = false;
      })}
    />
  );
}
