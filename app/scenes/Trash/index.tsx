import { observer } from "mobx-react";
import { TrashIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import PaginatedNoteList from "~/components/PaginatedNoteList";
import Scene from "~/components/Scene";
import Subheading from "~/components/Subheading";
import useStores from "~/hooks/useStores";
import TrashMenu from "~/menus/TrashMenu";
function Trash() {
  const { t } = useTranslation();
  const { notes } = useStores();
  return (
    <Scene icon={<TrashIcon />} title={t("Trash")} actions={<TrashMenu />}>
      <Heading>{t("Trash")}</Heading>
      <PaginatedNoteList
        notes={notes.deleted}
        fetch={notes.fetchDeleted}
        heading={<Subheading sticky>{t("Recently deleted")}</Subheading>}
        empty={<Empty>{t("Trash is empty at the moment.")}</Empty>}
        showNotebook
        showTemplate
      />
    </Scene>
  );
}
export default observer(Trash);
