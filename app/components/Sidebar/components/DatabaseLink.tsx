import { observer } from "mobx-react";
import { DatabaseIcon } from "outline-icons";
import { useLocation } from "react-router-dom";
import type Database from "~/models/Database";
import SidebarLink from "./SidebarLink";

type Props = {
  /** The database to render a link to. */
  database: Database;
  /** The nesting depth to render the link at. */
  depth?: number;
};

/**
 * A link to one database in the sidebar, listed under the collection it
 * belongs to and above that collection's documents.
 */
function DatabaseLink({ database, depth = 2 }: Props) {
  const location = useLocation();

  return (
    <SidebarLink
      to={{ pathname: database.path, state: { starred: false } }}
      icon={<DatabaseIcon />}
      label={database.name}
      depth={depth}
      isActive={() => location.pathname === database.path}
    />
  );
}

export default observer(DatabaseLink);
