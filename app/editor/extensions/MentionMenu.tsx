import { action } from "mobx";
import * as React from "react";
import { WidgetProps } from "@shared/editor/lib/Extension";
import Suggestion from "~/editor/extensions/Suggestion";
import MentionMenu from "../components/MentionMenu";

export default class MentionMenuExtension extends Suggestion {
  get defaultOptions() {
    return {
      trigger: "@",
      allowSpaces: true,
      requireSearchTerm: false,
      enabledInCode: false,
    };
  }

  get name() {
    return "mention-menu";
  }

  widget = ({ rtl }: WidgetProps) => (
    <MentionMenu
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
