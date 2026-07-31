import { observer } from "mobx-react";
import { ArchiveIcon, DatabaseIcon, RestoreIcon } from "outline-icons";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import type DatabaseModel from "~/models/Database";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import Scene from "~/components/Scene";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import { TeamPreference } from "@shared/types";

/** One archived database, with the action to bring it and its rows back. */
const ArchivedDatabase = observer(function ArchivedDatabase_({
  database,
}: {
  database: DatabaseModel;
}) {
  const { t } = useTranslation();
  const { databases } = useStores();

  const handleRestore = async () => {
    try {
      await databases.restore(database);
      toast.success(t("Database restored"));
    } catch (error) {
      toast.error(errToString(error));
    }
  };

  return (
    <Flex align="center" gap={8} style={{ padding: "8px 0" }}>
      <DatabaseIcon />
      <Text style={{ flexGrow: 1 }}>{database.name}</Text>
      <Button icon={<RestoreIcon />} onClick={handleRestore} neutral>
        {t("Restore")}
      </Button>
    </Flex>
  );
});

function Archive() {
  const { t } = useTranslation();
  const { documents, databases } = useStores();
  const team = useCurrentTeam();
  const databasesEnabled = !!team?.getPreference(
    TeamPreference.DocumentDatabases
  );

  useEffect(() => {
    if (databasesEnabled) {
      void databases.fetchAll({ archived: true });
    }
  }, [databasesEnabled, databases]);

  const archivedDatabases = databases.archived;

  return (
    <Scene icon={<ArchiveIcon />} title={t("Archive")}>
      <Heading>{t("Archive")}</Heading>
      {databasesEnabled && archivedDatabases.length > 0 && (
        <>
          <Subheading sticky>{t("Databases")}</Subheading>
          {archivedDatabases.map((database) => (
            <ArchivedDatabase key={database.id} database={database} />
          ))}
        </>
      )}
      <PaginatedDocumentList
        documents={documents.archived}
        fetch={documents.fetchArchived}
        heading={<Subheading sticky>{t("Documents")}</Subheading>}
        empty={
          <Empty>{t("The document archive is empty at the moment.")}</Empty>
        }
        showCollection
        showTemplate
      />
    </Scene>
  );
}

export default observer(Archive);
