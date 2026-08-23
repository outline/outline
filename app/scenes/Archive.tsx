import { observer } from "mobx-react";
import { ArchiveIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import PaginatedNoteList from "~/components/PaginatedNoteList";
import Scene from "~/components/Scene";
import Subheading from "~/components/Subheading";
import useStores from "~/hooks/useStores";
function Archive() {
  const { t } = useTranslation();
  const { notes } = useStores();
  return (
    <Scene icon={<ArchiveIcon />} title={t("Archive")}>
      <Heading>{t("Archive")}</Heading>
      <PaginatedNoteList
        notes={notes.archived}
        fetch={notes.fetchArchived}
        heading={<Subheading sticky>{t("Notes")}</Subheading>}
        empty={<Empty>{t("The note archive is empty at the moment.")}</Empty>}
        showNotebook
        showTemplate
      />
    </Scene>
  );
}
export default observer(Archive);
