import Extension from "@shared/editor/lib/Extension";
import { TableFilterMenu } from "../components/TableFilterMenu";

/**
 * Shows the menu to filter the rows of a table, in reading and editing mode.
 */
export default class TableFilterExtension extends Extension {
  get name() {
    return "table-filter";
  }

  get allowInReadOnly() {
    return true;
  }

  widget = () => <TableFilterMenu />;
}
