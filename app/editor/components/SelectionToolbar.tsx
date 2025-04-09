import some from "lodash/some";
import { EditorState, NodeSelection, TextSelection } from "prosemirror-state";
import * as React from "react";
import filterExcessSeparators from "@shared/editor/lib/filterExcessSeparators";
import { getMarkRange } from "@shared/editor/queries/getMarkRange";
import { isInCode } from "@shared/editor/queries/isInCode";
import { isInNotice } from "@shared/editor/queries/isInNotice";
import { isMarkActive } from "@shared/editor/queries/isMarkActive";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import { getColumnIndex, getRowIndex } from "@shared/editor/queries/table";
import { MenuItem } from "@shared/editor/types";
import useBoolean from "~/hooks/useBoolean";
import useDictionary from "~/hooks/useDictionary";
import useEventListener from "~/hooks/useEventListener";
import useMobile from "~/hooks/useMobile";
import usePrevious from "~/hooks/usePrevious";
import getPdfMenuItems from "../../editor/menus/pdf"; // Fixed import path for PDF menu items
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
import FloatingToolbar from "./FloatingToolbar";
import LinkEditor from "./LinkEditor";
import ToolbarMenu from "./ToolbarMenu";

type Props = {
  rtl: boolean;
  isTemplate: boolean;
  readOnly?: boolean;
  canComment?: boolean;
  canUpdate?: boolean;
  onOpen: () => void;
  onClose: () => void;
  onClickLink: (
    href: string,
    event: MouseEvent | React.MouseEvent<HTMLButtonElement>
  ) => void;
};

function useIsActive(state: EditorState) {
  const { selection, doc } = state;

  if (isMarkActive(state.schema.marks.link)(state)) {
    return true;
  }
  if (
    (isNodeActive(state.schema.nodes.code_block)(state) ||
      isNodeActive(state.schema.nodes.code_fence)(state)) &&
    selection.from > 0
  ) {
    return true;
  }
  // Temporarily remove command existence check AGAIN for debugging
  // if (item.name && !commands[item.name]) {
  //   console.log(
  //     `Filtering out item "${item.name}" - command not found in:`,
  //     Object.keys(commands)
  //   );
  //   return false;
  // }
  if (selection instanceof NodeSelection && selection.node.type.name === "hr") {
    return true;
  }
  if (
    selection instanceof NodeSelection &&
    ["image", "attachment", "pdf_document"].includes(selection.node.type.name) // Add pdf_document
  ) {
    // console.log("useIsActive: Matched NodeSelection for", selection.node.type.name); // Remove logging
    return true;
  }
  if (selection instanceof NodeSelection) {
    return false;
  }

  const selectionText = doc.cut(selection.from, selection.to).textContent;
  if (selection instanceof TextSelection && !selectionText) {
    return false;
  }

  const slice = selection.content();
  const fragment = slice.content;
  // Use the correct type for fragment content
  const nodes = (fragment as import("prosemirror-model").Fragment)
    .content as ReadonlyArray<import("prosemirror-model").Node>;

  return some(nodes, (n) => n.content.size);
}

function useIsDragging() {
  const [isDragging, setDragging, setNotDragging] = useBoolean();
  useEventListener("dragstart", setDragging);
  useEventListener("dragend", setNotDragging);
  useEventListener("drop", setNotDragging);
  return isDragging;
}

export default function SelectionToolbar(props: Props) {
  const { onClose, readOnly, onOpen } = props;
  const { view, commands } = useEditor();
  const dictionary = useDictionary();
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const isMobile = useMobile();
  const isActive = useIsActive(view.state) || isMobile;
  const isDragging = useIsDragging();
  const previousIsActive = usePrevious(isActive);

  React.useEffect(() => {
    // Trigger callbacks when the toolbar is opened or closed
    if (previousIsActive && !isActive) {
      onClose();
    }
    if (!previousIsActive && isActive) {
      onOpen();
    }
  }, [isActive, onClose, onOpen, previousIsActive]);

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
  }, [isActive, previousIsActive, readOnly, view]);

  const handleOnSelectLink = ({
    href,
    from,
    to,
  }: {
    href: string;
    from: number;
    to: number;
  }): void => {
    const { state, dispatch } = view;

    const markType = state.schema.marks.link;

    dispatch(
      state.tr
        .removeMark(from, to, markType)
        .addMark(from, to, markType.create({ href }))
    );
  };

  const { isTemplate, rtl, canComment, canUpdate, ...rest } = props;
  const { state: editorState } = view; // Rename state to avoid shadowing
  const { selection } = editorState;
  const isDividerSelection = isNodeActive(editorState.schema.nodes.hr)(
    editorState
  );

  if ((readOnly && !canComment) || isDragging) {
    return null;
  }

  const colIndex = getColumnIndex(editorState);
  const rowIndex = getRowIndex(editorState);
  const isTableSelection = colIndex !== undefined && rowIndex !== undefined;
  const link = getMarkRange(selection.$from, editorState.schema.marks.link);
  const isImageSelection =
    selection instanceof NodeSelection && selection.node.type.name === "image";
  const isAttachmentSelection =
    selection instanceof NodeSelection &&
    selection.node.type.name === "attachment";
  const isPdfSelection = // Check for PDF node selection
    selection instanceof NodeSelection &&
    selection.node.type.name === "pdf_document";
  const isCodeSelection = isInCode(editorState, { onlyBlock: true });
  const isNoticeSelection = isInNotice(editorState);

  let items: MenuItem[] = [];

  if (isCodeSelection && selection.empty) {
    items = getCodeMenuItems(editorState, readOnly, dictionary);
  } else if (isTableSelection) {
    items = getTableMenuItems(editorState, dictionary);
  } else if (colIndex !== undefined) {
    items = getTableColMenuItems(editorState, colIndex, rtl, dictionary);
  } else if (rowIndex !== undefined) {
    items = getTableRowMenuItems(editorState, rowIndex, dictionary);
  } else if (isImageSelection) {
    items = readOnly ? [] : getImageMenuItems(editorState, dictionary);
  } else if (isAttachmentSelection) {
    items = readOnly ? [] : getAttachmentMenuItems(editorState, dictionary);
  } else if (isPdfSelection) {
    // Add case for PDF selection
    items = readOnly ? [] : getPdfMenuItems(editorState, dictionary);
  } else if (isDividerSelection) {
    items = getDividerMenuItems(editorState, dictionary);
  } else if (readOnly) {
    items = getReadOnlyMenuItems(editorState, !!canUpdate, dictionary);
  } else if (isNoticeSelection && selection.empty) {
    items = getNoticeMenuItems(editorState, readOnly, dictionary);
  } else {
    items = getFormattingMenuItems(
      editorState,
      isTemplate,
      isMobile,
      dictionary
    );
  }

  // Some extensions may be disabled, remove corresponding items
  items = items.filter((item) => {
    if (item.name === "separator") {
      return true;
    }
    // Restore command existence check and remove logging
    if (item.name && !commands[item.name]) {
      // console.log(
      //   `Filtering out item "${item.name}" - command not found in:`,
      //   Object.keys(commands)
      // );
      return false;
    }
    if (item.visible === false) {
      return false;
    }
    return true;
  });

  items = filterExcessSeparators(items);
  if (!items.length) {
    return null;
  }

  const showLinkToolbar =
    link && link.from === selection.from && link.to === selection.to;

  return (
    <FloatingToolbar
      active={isActive}
      ref={menuRef}
      width={showLinkToolbar ? 336 : undefined}
    >
      {showLinkToolbar ? (
        <LinkEditor
          key={`${link.from}-${link.to}`}
          dictionary={dictionary}
          view={view}
          mark={link.mark}
          from={link.from}
          to={link.to}
          onClickLink={props.onClickLink}
          onSelectLink={handleOnSelectLink}
        />
      ) : (
        <ToolbarMenu items={items} {...rest} />
      )}
    </FloatingToolbar>
  );
}
