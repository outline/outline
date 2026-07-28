import { observer } from "mobx-react";
import { DatabaseIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import type Database from "~/models/Database";
import Fade from "~/components/Fade";
import Icon from "@shared/components/Icon";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import DatabaseMenu from "~/menus/DatabaseMenu";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import SidebarLink from "./SidebarLink";

type Props = {
  /** The database to render a link to. */
  database: Database;
  /** The nesting depth to render the link at. */
  depth?: number;
};

/** The most rows listed under a database in the sidebar. */
const MAX_SIDEBAR_ROWS = 25;

/**
 * A link to one database in the sidebar, listed under the collection it
 * belongs to and above that collection's documents. Expanding the link lists
 * the database's rows, capped so a large database cannot flood the sidebar.
 */
function DatabaseLink({ database, depth = 2 }: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const history = useHistory();
  const location = useLocation();
  const can = usePolicy(database);
  const [expanded, setExpanded] = React.useState(false);

  const rows = documents.inDatabase(database.id);

  React.useEffect(() => {
    if (expanded) {
      void documents
        .fetchInDatabase({ databaseId: database.id, limit: MAX_SIDEBAR_ROWS })
        .catch((error) => toast.error(errToString(error)));
    }
  }, [expanded, documents, database.id]);

  const handleDisclosureClick = React.useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleNewRow = React.useCallback(
    async (ev: React.MouseEvent) => {
      // the button lives inside the link, so without this the click would
      // follow the anchor natively and unload the page mid-request
      ev.preventDefault();
      ev.stopPropagation();
      try {
        const document = await documents.create(
          {
            title: "",
            collectionId: database.collectionId,
            databaseId: database.id,
          },
          { publish: true }
        );
        setExpanded(true);
        history.push(document.path);
      } catch (error) {
        toast.error(errToString(error));
      }
    },
    [documents, database, history]
  );

  return (
    <>
      <SidebarLink
        to={{ pathname: database.path, state: { starred: false } }}
        icon={<DatabaseIcon />}
        label={database.name}
        depth={depth}
        expanded={expanded}
        onDisclosureClick={handleDisclosureClick}
        isActive={() => location.pathname === database.path}
        menu={
          <Fade>
            {can.createRow && (
              <Tooltip content={t("New row")} delay={500}>
                <NudeButton aria-label={t("New row")} onClick={handleNewRow}>
                  <PlusIcon />
                </NudeButton>
              </Tooltip>
            )}
            <DatabaseMenu database={database} />
          </Fade>
        }
      />
      {expanded && (
        <>
          {rows.map((row) => (
            <SidebarLink
              key={row.id}
              to={row.path}
              icon={
                row.icon ? (
                  <Icon
                    value={row.icon}
                    color={row.color ?? undefined}
                    initial={row.titleWithDefault[0]}
                  />
                ) : undefined
              }
              label={row.titleWithDefault}
              depth={depth + 1}
              isActive={() => location.pathname === row.path}
            />
          ))}
          {rows.length === 0 && (
            <SidebarLink
              label={
                <Text type="tertiary" size="small" italic>
                  {t("Empty")}
                </Text>
              }
              depth={depth + 1}
            />
          )}
          {rows.length >= MAX_SIDEBAR_ROWS && (
            <SidebarLink
              label={
                <Text type="tertiary" size="small">
                  {t("Show all")}…
                </Text>
              }
              onClick={() => history.push(database.path)}
              depth={depth + 1}
            />
          )}
        </>
      )}
    </>
  );
}

export default observer(DatabaseLink);
