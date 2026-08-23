import { observer } from "mobx-react";
import { TrashIcon } from "outline-icons";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import NoteDelete from "~/scenes/NoteDelete";
import { DialogTitle } from "~/components/DialogTitle";
import useStores from "~/hooks/useStores";
import * as Scenes from "~/routes/scenes";
import { trashPath } from "~/utils/routeHelpers";
import type { DragObject } from "../hooks/useDragAndDrop";
import SidebarLink from "./SidebarLink";
function TrashLink() {
  const { policies, dialogs, notes } = useStores();
  const { t } = useTranslation();
  const [{ isNoteDropping }, dropToTrashRef] = useDrop({
    accept: "document",
    drop: async (item: DragObject) => {
      const note = notes.get(item.id);
      if (!note) {
        return;
      }
      dialogs.openModal({
        title: (
          <DialogTitle
            title={t("Delete {{ documentName }}", {
              noteName: note.noun,
            })}
            model={note}
          />
        ),
        content: <NoteDelete note={note} onSubmit={dialogs.closeAllModals} />,
      });
    },
    canDrop: (item) => policies.abilities(item.id).delete,
    collect: (monitor) => ({
      isNoteDropping: monitor.isOver(),
    }),
  });
  return (
    <div ref={dropToTrashRef}>
      <SidebarLink
        to={trashPath()}
        onClickIntent={Scenes.Trash.preload}
        icon={<TrashIcon open={isNoteDropping} />}
        exact={false}
        label={t("Trash")}
        active={notes.active?.isDeleted}
        isActiveDrop={isNoteDropping}
      />
    </div>
  );
}
export default observer(TrashLink);
