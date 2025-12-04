import { Selection, NodeSelection, TextSelection } from "prosemirror-state";
import * as React from "react";
import filterExcessSeparators from "@shared/editor/lib/filterExcessSeparators";
import {
  getMarkRange,
  getMarkRangeNodeSelection,
} from "@shared/editor/queries/getMarkRange";
import { isInCode } from "@shared/editor/queries/isInCode";
import { isInNotice } from "@shared/editor/queries/isInNotice";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import {
  getColumnIndex,
  getRowIndex,
  isTableSelected,
} from "@shared/editor/queries/table";
import { MenuItem } from "@shared/editor/types";
import useBoolean from "~/hooks/useBoolean";
import useDictionary from "~/hooks/useDictionary";
import useEventListener from "~/hooks/useEventListener";
import useMobile from "~/hooks/useMobile";
import getAttachmentMenuItems from "../menus/attachment";
import getCodeMenuItems from "../menus/code";
import getDividerMenuItems from "../menus/divider";
import getFormattingMenuItems from "../menus/formatting";
import getImageMenuItems from "../menus/image";
import getNoticeMenuItems from "../menus/notice";
import getReadOnlyMenuItems from "../menus/readOnly";
import getTableMenuItems from "../menus/table";
import getTableColMenuItems from "../menus/tableCol";
import getTableRowMenuItems from "../menus/tableRow";
import { useEditor } from "./EditorContext";
import { MediaLinkEditor } from "./MediaLinkEditor";
import FloatingToolbar from "./FloatingToolbar";
import LinkEditor from "./LinkEditor";
import ToolbarMenu from "./ToolbarMenu";
import { isModKey } from "@shared/utils/keyboard";

type Props = {
  /** Whether the text direction is right-to-left */
  rtl: boolean;
  /** Whether the current document is a template */
  isTemplate: boolean;
  /** Whether the toolbar is currently active/visible */
  isActive: boolean;
  /** The current selection */
  selection?: Selection;
  /** Whether the editor is in read-only mode */
  readOnly?: boolean;
  /** Whether the user has permission to add comments */
  canComment?: boolean;
  /** Whether the user has permission to update the document */
  canUpdate?: boolean;
};

function useIsDragging() {
  const [isDragging, setDragging, setNotDragging] = useBoolean();
  useEventListener("dragstart", setDragging);
  useEventListener("dragend", setNotDragging);
  useEventListener("drop", setNotDragging);
  return isDragging;
}

enum TOOLBAR {
  Link = "link",
  Media = "media",
  Menu = "menu",
}

export function SelectionToolbar(props: Props) {
  const { readOnly = false } = props;
  const { view, commands } = useEditor();
  const dictionary = useDictionary();
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const isMobile = useMobile();
  const isActive = props.isActive || isMobile;
  const isDragging = useIsDragging();

  const { state } = view;
  const { selection } = state;
  const isEmbedSelection =
    selection instanceof NodeSelection && selection.node.type.name === "embed";
  const [activeToolbar, setActiveToolbar] = React.useState<TOOLBAR | null>(
    null
  );

  React.useEffect(() => {
    if (isEmbedSelection) {
      setActiveToolbar(TOOLBAR.Media);
    } else if (!selection.empty) {
      setActiveToolbar(TOOLBAR.Menu);
    }
  }, [selection]);

  React.useEffect(() => {
    const handleClickOutside = (ev: MouseEvent): void => {
      if (
        ev.target instanceof HTMLElement &&
        menuRef.current &&
        menuRef.current.contains(ev.target)
      ) {
        return;
      }
      if (view.dom.contains(ev.target as HTMLElement)) {
        return;
      }

      if (!isActive || document.activeElement?.tagName === "INPUT") {
        return;
      }

      if (!window.getSelection()?.isCollapsed) {
        return;
      }

      const { dispatch } = view;
      dispatch(
        view.state.tr.setSelection(new TextSelection(view.state.doc.resolve(0)))
      );
    };

    window.addEventListener("mouseup", handleClickOutside);

    return () => {
      window.removeEventListener("mouseup", handleClickOutside);
    };
  }, [isActive, readOnly, view]);

  if (isDragging) {
    return null;
  }

  const { isTemplate, rtl, canComment, canUpdate, ...rest } = props;

  const isDividerSelection = isNodeActive(state.schema.nodes.hr)(state);
  const colIndex = getColumnIndex(state);
  const rowIndex = getRowIndex(state);
  const isImageSelection =
    selection instanceof NodeSelection && selection.node.type.name === "image";
  const isAttachmentSelection =
    selection instanceof NodeSelection &&
    selection.node.type.name === "attachment";
  const isCodeSelection = isInCode(state, { onlyBlock: true });
  const isNoticeSelection = isInNotice(state);
  const link =
    selection instanceof NodeSelection
      ? getMarkRangeNodeSelection(selection, state.schema.marks.link)
      : getMarkRange(selection.$from, state.schema.marks.link);

  let items: MenuItem[] = [];
  let align: "center" | "start" | "end" = "center";

  if (isCodeSelection && selection.empty) {
    items = getCodeMenuItems(state, readOnly, dictionary);
    align = "end";
  } else if (isTableSelected(state)) {
    items = getTableMenuItems(state, readOnly, dictionary);
  } else if (colIndex !== undefined) {
    items = getTableColMenuItems(state, readOnly, dictionary, {
      index: colIndex,
      rtl,
    });
  } else if (rowIndex !== undefined) {
    items = getTableRowMenuItems(state, readOnly, dictionary, {
      index: rowIndex,
    });
  } else if (isImageSelection) {
    items = getImageMenuItems(state, readOnly, dictionary);
  } else if (isAttachmentSelection) {
    items = getAttachmentMenuItems(state, readOnly, dictionary);
  } else if (isDividerSelection) {
    items = getDividerMenuItems(state, readOnly, dictionary);
  } else if (readOnly) {
    items = getReadOnlyMenuItems(state, !!canUpdate, dictionary);
  } else if (isNoticeSelection && selection.empty) {
    items = getNoticeMenuItems(state, readOnly, dictionary);
    align = "end";
  } else {
    items = getFormattingMenuItems(state, isTemplate, dictionary);
  }

  // Some extensions may be disabled, remove corresponding items
  items = items.filter((item) => {
    if (item.name === "separator") {
      return true;
    }
    if (item.name === "dimensions") {
      return item.visible ?? false;
    }
    if (item.name && !commands[item.name]) {
      return false;
    }
    if (item.visible === false) {
      return false;
    }
    return true;
  });

  items = filterExcessSeparators(items);
  items = items.map((item) => {
    if (item.children) {
      item.children = item.children.map((child) => {
        if (child.name === "editImageUrl") {
          child.onClick = () => {
            setActiveToolbar(TOOLBAR.Media);
          };
        }
        return child;
      });
    }

    if (item.name === "linkOnImage" || item.name === "addLink") {
      item.onClick = () => {
        setActiveToolbar(TOOLBAR.Link);
      };
    }
    return item;
  });

  if (!items.length) {
    return null;
  }

  useEventListener(
    "keydown",
    (ev: KeyboardEvent) => {
      if (
        isModKey(ev) &&
        ev.key.toLowerCase() === "k" &&
        !view.state.selection.empty
      ) {
        ev.stopPropagation();
        if (activeToolbar === TOOLBAR.Link) {
          setActiveToolbar(TOOLBAR.Menu);
        } else if (activeToolbar === TOOLBAR.Menu) {
          setActiveToolbar(TOOLBAR.Link);
        }
      }
    },
    view.dom,
    { capture: true }
  );

  if (!activeToolbar) {
    return null;
  }

  return (
    <FloatingToolbar
      align={align}
      active={isActive}
      ref={menuRef}
      width={
        activeToolbar === TOOLBAR.Link || activeToolbar === TOOLBAR.Media
          ? 336
          : undefined
      }
    >
      {activeToolbar === TOOLBAR.Link ? (
        <LinkEditor
          key={`${selection.from}-${selection.to}`}
          dictionary={dictionary}
          view={view}
          mark={link ? link.mark : undefined}
          onLinkAdd={() => setActiveToolbar(null)}
          onLinkUpdate={() => setActiveToolbar(null)}
          onLinkRemove={() => setActiveToolbar(null)}
          onEscape={() => setActiveToolbar(TOOLBAR.Menu)}
          onClickOutside={() => setActiveToolbar(null)}
          onBackButtonPress={() => setActiveToolbar(TOOLBAR.Menu)}
        />
      ) : activeToolbar === TOOLBAR.Media ? (
        <MediaLinkEditor
          key={`embed-${selection.from}`}
          node={(selection as NodeSelection).node}
          view={view}
          dictionary={dictionary}
          onLinkUpdate={() => setActiveToolbar(null)}
          onLinkRemove={() => setActiveToolbar(null)}
          onEscape={() => setActiveToolbar(TOOLBAR.Menu)}
          onClickOutside={() => setActiveToolbar(null)}
        />
      ) : (
        <ToolbarMenu items={items} {...rest} />
      )}
    </FloatingToolbar>
  );
}
