import { observer } from "mobx-react";
import * as React from "react";
import { useHistory } from "react-router-dom";
import { UserPreference } from "@shared/types";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import type Notebook from "~/models/Notebook";
import type Note from "~/models/Note";
import type { RefHandle } from "~/components/EditableTitle";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useNotebookMenuAction } from "~/hooks/useNotebookMenuAction";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import NotebookMenu from "~/menus/NotebookMenu";
import * as Scenes from "~/routes/scenes";
import useBoolean from "~/hooks/useBoolean";
import { noteEditPath } from "~/utils/routeHelpers";
import { useDropToChangeNotebook } from "../hooks/useDragAndDrop";
import NotebookLinkChildren from "./NotebookLinkChildren";
import NotebookRow from "./NotebookRow";
import { useSidebarContext } from "./SidebarContext";
type Props = {
  notebook: Notebook;
  expanded?: boolean;
  onDisclosureClick: (ev?: React.MouseEvent<HTMLElement>) => void;
  activeNote: Note | undefined;
  isDraggingAnyNotebook?: boolean;
  depth?: number;
  onClick?: () => void;
};
const NotebookLink: React.FC<Props> = ({
  notebook,
  expanded,
  onDisclosureClick,
  isDraggingAnyNotebook,
  depth,
  onClick,
}: Props) => {
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const { notes } = useStores();
  const history = useHistory();
  const can = usePolicy(notebook);
  const sidebarContext = useSidebarContext();
  const user = useCurrentUser();
  const editableTitleRef = React.useRef<RefHandle>(null);
  const handleTitleChange = React.useCallback(
    async (name: string) => {
      await notebook.save({ name });
    },
    [notebook]
  );
  const handleExpand = React.useCallback(() => {
    if (!expanded) {
      onDisclosureClick();
    }
  }, [expanded, onDisclosureClick]);
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [{ isOver, canDrop }, dropRef] = useDropToChangeNotebook(
    notebook,
    handleExpand,
    parentRef
  );
  const handlePrefetch = React.useCallback(() => {
    void Scenes.Notebook.preload();
    void notebook.fetchNotes();
  }, [notebook]);
  const handleRename = React.useCallback(() => {
    editableTitleRef.current?.setIsEditing(true);
  }, []);
  const handleNewDoc = React.useCallback(
    async (input: string) => {
      const newNote = await notes.create(
        {
          notebookId: notebook.id,
          title: input,
          fullWidth: user.getPreference(UserPreference.FullWidthNotes),
          data: ProsemirrorDataHelper.getEmpty(),
        },
        { publish: true }
      );
      notebook?.addNote(newNote);
      history.push({
        pathname: noteEditPath(newNote),
        state: { sidebarContext },
      });
    },
    [user, sidebarContext, history, notebook, notes]
  );
  const contextMenuAction = useNotebookMenuAction({
    notebookId: notebook.id,
    onRename: handleRename,
  });
  const menu = !isDraggingAnyNotebook ? (
    <NotebookMenu
      notebook={notebook}
      onRename={handleRename}
      onOpen={handleMenuOpen}
      onClose={handleMenuClose}
    />
  ) : undefined;
  return (
    <NotebookRow
      notebook={notebook}
      depth={depth}
      to={{ pathname: notebook.path, state: { sidebarContext } }}
      onClick={onClick}
      onClickIntent={handlePrefetch}
      expanded={expanded}
      onDisclosureClick={onDisclosureClick}
      onExpand={handleExpand}
      canEdit={can.update}
      labelText={notebook.name}
      onTitleChange={handleTitleChange}
      editableTitleRef={editableTitleRef}
      contextAction={contextMenuAction}
      menu={menu}
      menuOpen={menuOpen}
      canCreateChild={!isDraggingAnyNotebook && can.createNote}
      onCreateChild={handleNewDoc}
      parentRef={parentRef}
      dropRef={dropRef}
      isActiveDropTarget={isOver && canDrop}
    >
      <NotebookLinkChildren
        notebook={notebook}
        expanded={!!expanded}
        depth={depth}
        prefetchNote={notes.prefetchNote}
      />
    </NotebookRow>
  );
};
export default observer(NotebookLink);
