import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import type Note from "~/models/Note";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { newNotePath, newNestedNotePath } from "~/utils/routeHelpers";
import { createInternalLinkAction } from "~/actions";
import { ActiveNoteSection } from "~/actions/sections";
import { useMenuAction } from "~/hooks/useMenuAction";
import Tooltip from "~/components/Tooltip";
import Button from "~/components/Button";
import { PlusIcon } from "outline-icons";
type Props = {
  note: Note;
};
function NewChildNoteMenu({ note }: Props) {
  const { t } = useTranslation();
  const canNotebook = usePolicy(note.notebookId);
  const { notebooks } = useStores();
  const notebook = note.notebookId ? notebooks.get(note.notebookId) : undefined;
  const notebookName = notebook ? notebook.name : t("notebook");
  const actions = React.useMemo(
    () => [
      createInternalLinkAction({
        name: (
          <Trans
            defaults="New document in <em>{{ notebookName }}</em>"
            values={{
              notebookName,
            }}
            components={{
              em: <strong />,
            }}
          />
        ),
        section: ActiveNoteSection,
        visible: !!canNotebook.createNote,
        to: newNotePath(note.notebookId),
      }),
      createInternalLinkAction({
        name: (
          <Trans
            defaults="New document in <em>{{ notebookName }}</em>"
            values={{
              notebookName: note.titleWithDefault,
            }}
            components={{
              em: <strong />,
            }}
          />
        ),
        section: ActiveNoteSection,
        visible: true,
        to: newNestedNotePath(note.id),
      }),
    ],
    [
      notebookName,
      canNotebook.createNote,
      note.id,
      note.titleWithDefault,
      note.notebookId,
    ]
  );
  const rootAction = useMenuAction(actions);
  return (
    <Tooltip content={t("New document")} shortcut="n" placement="bottom">
      <DropdownMenu
        action={rootAction}
        align="end"
        ariaLabel={t("New child document")}
      >
        <Button icon={<PlusIcon />} neutral>
          {t("New doc")}
        </Button>
      </DropdownMenu>
    </Tooltip>
  );
}
export default observer(NewChildNoteMenu);
