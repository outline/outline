import { action } from "mobx";
import type { WidgetProps } from "@shared/editor/lib/Extension";
import Suggestion from "~/editor/extensions/Suggestion";
import HashtagMenu from "../components/HashtagMenu";

export default class HashtagMenuExtension extends Suggestion {
  get defaultOptions() {
    return {
      trigger: "#",
      allowSpaces: false,
      requireSearchTerm: true, // Require at least one character after #
      enabledInCode: false,
    };
  }

  get name() {
    return "hashtag-menu";
  }

  widget = ({ rtl }: WidgetProps) => (
    <HashtagMenu
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
