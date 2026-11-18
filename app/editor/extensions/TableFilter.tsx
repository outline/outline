import type { Plugin } from "prosemirror-state";
import Extension from "@shared/editor/lib/Extension";
import { TableFilterPlugin } from "@shared/editor/plugins/TableFilterPlugin";
import { TableFilterMenu } from "../components/TableFilterMenu";

/**
 * Filters the rows of tables, and shows the menu to change the filters, in
 * reading and editing mode. Editors without this extension show every row.
 */
export default class TableFilterExtension extends Extension {
  get name() {
    return "table-filter";
  }

  get allowInReadOnly() {
    return true;
  }

  get plugins(): Plugin[] {
    return [new TableFilterPlugin()];
  }

  widget = () => <TableFilterMenu />;
}
