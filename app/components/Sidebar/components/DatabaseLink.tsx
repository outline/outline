import { observer } from "mobx-react";
import { DatabaseIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import type Database from "~/models/Database";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
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
  const { t } = useTranslation();
  const { documents } = useStores();
  const history = useHistory();
  const location = useLocation();
  const can = usePolicy(database);

  const handleNewRow = React.useCallback(async () => {
    try {
      const document = await documents.create(
        {
          title: "",
          collectionId: database.collectionId,
          databaseId: database.id,
        },
        { publish: true }
      );
      history.push(document.path);
    } catch (error) {
      toast.error(errToString(error));
    }
  }, [documents, database, history]);

  return (
    <SidebarLink
      to={{ pathname: database.path, state: { starred: false } }}
      icon={<DatabaseIcon />}
      label={database.name}
      depth={depth}
      isActive={() => location.pathname === database.path}
      menu={
        can.createRow ? (
          <Fade>
            <Tooltip content={t("New row")} delay={500}>
              <NudeButton aria-label={t("New row")} onClick={handleNewRow}>
                <PlusIcon />
              </NudeButton>
            </Tooltip>
          </Fade>
        ) : undefined
      }
    />
  );
}

export default observer(DatabaseLink);
