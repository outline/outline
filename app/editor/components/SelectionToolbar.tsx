import type { EditorState, Selection } from "prosemirror-state";
import Suggestion from "~/editor/extensions/Suggestion";
import { NodeSelection, TextSelection } from "prosemirror-state";
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
import type { MenuItem } from "@shared/editor/types";
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
import {
  columnDragPluginKey,
  rowDragPluginKey,
} from "@shared/editor/plugins/TableDragState";
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

function useIsDragging(state: EditorState) {
  const [isDragging, setDragging, setNotDragging] = useBoolean();
  useEventListener("dragstart", setDragging);
  useEventListener("dragend", setNotDragging);
  useEventListener("drop", setNotDragging);

  // Check if table row or column is being dragged
  const columnDragState = columnDragPluginKey.getState(state);
  const rowDragState = rowDragPluginKey.getState(state);
  const isTableDragging =
    columnDragState?.isDragging || rowDragState?.isDragging;

  return isDragging || isTableDragging;
}

enum Toolbar {
  Link = "link",
  Media = "media",
  Menu = "menu",
}

export function SelectionToolbar(props: Props) {
  const { readOnly = false } = props;
  const { view, extensions, commands } = useEditor();
  const dictionary = useDictionary();
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const isMobile = useMobile();
  const isActive = props.isActive || isMobile;
  const { state } = view;
  const [autoFocusLinkInput, setAutoFocusLinkInput] = React.useState(false);
  const isDragging = useIsDragging(state);
  const { selection } = state;
  const [activeToolbar, setActiveToolbar] = React.useState<Toolbar | null>(
    null
  );

  const linkMark =
    selection instanceof NodeSelection
      ? getMarkRangeNodeSelection(selection, state.schema.marks.link)
      : getMarkRange(selection.$from, state.schema.marks.link);

  const isEmbedSelection =
    selection instanceof NodeSelection && selection.node.type.name === "embed";

  const isCodeSelection = isInCode(state, { onlyBlock: true });
  const isNoticeSelection = isInNotice(state);

  React.useLayoutEffect(() => {
    if (!isActive) {
      setActiveToolbar(null);
      return;
    }

    if (isEmbedSelection && !readOnly) {
      setActiveToolbar(Toolbar.Media);
    } else if (
      linkMark &&
      (activeToolbar === null || activeToolbar === Toolbar.Link) &&
      !readOnly
    ) {
      setActiveToolbar(Toolbar.Link);
    } else if (isCodeSelection) {
      setActiveToolbar(Toolbar.Menu);
    } else if (!selection.empty) {
      setActiveToolbar(Toolbar.Menu);
    } else if (isNoticeSelection && selection.empty) {
      setActiveToolbar(Toolbar.Menu);
    } else if (selection.empty) {
      setActiveToolbar(null);
    }
  }, [
    readOnly,
    isActive,
    selection,
    linkMark,
    isEmbedSelection,
    isCodeSelection,
    isNoticeSelection,
  ]);

  React.useLayoutEffect(() => {
    if (autoFocusLinkInput && activeToolbar !== Toolbar.Link) {
      setAutoFocusLinkInput(false);
    }
  }, [activeToolbar]);

  // Refocus the editor when the link toolbar closes to prevent focus loss
  const prevActiveToolbar = React.useRef(activeToolbar);
  React.useLayoutEffect(() => {
    if (
      prevActiveToolbar.current === Toolbar.Link &&
      activeToolbar !== Toolbar.Link &&
      !readOnly &&
      isActive
    ) {
      view.focus();
    }
    prevActiveToolbar.current = activeToolbar;
  }, [activeToolbar, readOnly, isActive, view]);

  React.useLayoutEffect(() => {
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

      // Don't collapse selection if any suggestion menu is open
      const isSuggestionMenuOpen = extensions.extensions.some(
        (ext) => ext instanceof Suggestion && ext.isOpen
      );
      if (isSuggestionMenuOpen) {
        return;
      }

      if (!window.getSelection()?.isCollapsed) {
        return;
      }

      const { dispatch } = view;
      dispatch(
        view.state.tr.setSelection(
          TextSelection.near(view.state.doc.resolve(0))
        )
      );
    };

    window.addEventListener("mouseup", handleClickOutside);

    return () => {
      window.removeEventListener("mouseup", handleClickOutside);
    };
  }, [isActive, readOnly, view]);

  useEventListener(
    "keydown",
    (ev: KeyboardEvent) => {
      if (
        isModKey(ev) &&
        ev.key.toLowerCase() === "k" &&
        !view.state.selection.empty
      ) {
        ev.preventDefault();
        ev.stopPropagation();
        setAutoFocusLinkInput(true);
        setActiveToolbar(
          activeToolbar === Toolbar.Link ? Toolbar.Menu : Toolbar.Link
        );
      }
    },
    view.dom,
    { capture: true }
  );

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
    if (item.children && Array.isArray(item.children)) {
      item.children = item.children.map((child) => {
        if (child.name === "editImageUrl") {
          child.onClick = () => {
            setActiveToolbar(Toolbar.Media);
          };
        }
        return child;
      });
    }

    if (item.name === "linkOnImage" || item.name === "addLink") {
      item.onClick = () => {
        setAutoFocusLinkInput(true);
        setActiveToolbar(Toolbar.Link);
      };
    }
    return item;
  });

  const handleClickOutsideLinkEditor = (ev: MouseEvent | TouchEvent) => {
    if (ev.target instanceof Element && ev.target.closest(".image-wrapper")) {
      return;
    }
    setActiveToolbar(null);
  };

  return (
    <FloatingToolbar
      align={align}
      active={isActive}
      ref={menuRef}
      width={
        activeToolbar === Toolbar.Link || activeToolbar === Toolbar.Media
          ? 336
          : undefined
      }
    >
      {activeToolbar === Toolbar.Link ? (
        <LinkEditor
          key={`link-${selection.anchor}`}
          dictionary={dictionary}
          autoFocus={autoFocusLinkInput}
          view={view}
          mark={linkMark ? linkMark.mark : undefined}
          onLinkAdd={() => setActiveToolbar(null)}
          onLinkUpdate={() => setActiveToolbar(null)}
          onLinkRemove={() => setActiveToolbar(null)}
          onEscape={() => setActiveToolbar(Toolbar.Menu)}
          onClickOutside={handleClickOutsideLinkEditor}
          onClickBack={() => setActiveToolbar(Toolbar.Menu)}
        />
      ) : activeToolbar === Toolbar.Media ? (
        <MediaLinkEditor
          key={`embed-${selection.anchor}`}
          node={
            "node" in selection ? (selection as NodeSelection).node : undefined
          }
          view={view}
          dictionary={dictionary}
          onLinkUpdate={() => setActiveToolbar(null)}
          onLinkRemove={() => setActiveToolbar(null)}
          onEscape={() => setActiveToolbar(Toolbar.Menu)}
          onClickOutside={handleClickOutsideLinkEditor}
        />
      ) : activeToolbar === Toolbar.Menu && items.length ? (
        <ToolbarMenu items={items} {...rest} />
      ) : null}
    </FloatingToolbar>
  );
}
