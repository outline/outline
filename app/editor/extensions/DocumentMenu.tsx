import { action } from "mobx";
import type { WidgetProps } from "@shared/editor/lib/Extension";
import Suggestion from "~/editor/extensions/Suggestion";
import DocumentMenu from "../components/DocumentMenu";

/**
 * A wiki-link style trigger that opens a suggestions menu of documents, for
 * linking to an existing document or creating a new one.
 */
export default class DocumentMenuExtension extends Suggestion {
  get defaultOptions() {
    return {
      trigger: ["[["],
      allowSpaces: true,
      requireSearchTerm: false,
      enabledInCode: false,
    };
  }

  get name() {
    return "document-menu";
  }

  widget = ({ rtl }: WidgetProps) => (
    <DocumentMenu
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
