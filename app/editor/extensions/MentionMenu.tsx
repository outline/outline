import { action } from "mobx";
import * as React from "react";
import { WidgetProps } from "@shared/editor/lib/Extension";
import Suggestion from "~/editor/extensions/Suggestion";
import MentionMenu from "../components/MentionMenu";

export default class MentionMenuExtension extends Suggestion {
  get defaultOptions() {
    return {
      // ported from https://github.com/tc39/proposal-regexp-unicode-property-escapes#unicode-aware-version-of-w
      openRegex: /(?:^|\s|\()@([\p{L}\p{M}\d]+)?$/u,
      closeRegex: /(?:^|\s|\()@(([\p{L}\p{M}\d]*\s+)|(\s+[\p{L}\p{M}\d]+))$/u,
    };
  }

  get name() {
    return "mention-menu";
  }

  widget = ({ rtl }: WidgetProps) => (
    <MentionMenu
      rtl={rtl}
      isActive={this.state.open}
      search={this.state.query}
      onClose={action(() => {
        this.state.open = false;
      })}
    />
  );
}
