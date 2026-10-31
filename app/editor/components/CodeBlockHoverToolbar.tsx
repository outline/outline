import { observer } from "mobx-react";
import * as React from "react";
import { buildSelectionContext } from "@shared/editor/lib/buildSelectionContext";
import filterExcessSeparators from "@shared/editor/lib/filterExcessSeparators";
import { isCode } from "@shared/editor/lib/isCode";
import { findParentNodeClosestToPos } from "@shared/editor/queries/findParentNode";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { isTouchDevice } from "@shared/utils/browser";
import useEventListener from "~/hooks/useEventListener";
import useMobile from "~/hooks/useMobile";
import getCodeMenuItems from "../menus/code";
import { useEditor } from "./EditorContext";
import StickyBlockToolbar from "./StickyBlockToolbar";

interface Props {
  /** Whether the text direction is right-to-left. */
  rtl: boolean;
  /** Whether the current document is a template. */
  isTemplate: boolean;
}

/** Delay in ms before the toolbar hides once the pointer leaves the block. */
const hideDelay = 150;

/**
 * Renders the code block toolbar over the code block under the pointer, for
 * read-only editors where there is no selection to show it for.
 *
 * @param props - the component props.
 * @returns the toolbar, or null when no code block is hovered.
 */
export const CodeBlockHoverToolbar = observer(function CodeBlockHoverToolbar({
  rtl,
  isTemplate,
}: Props) {
  const editor = useEditor();
  const { view } = editor;
  const isMobile = useMobile();
  const [element, setElement] = React.useState<HTMLElement | null>(null);
  const hideTimeout = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const toolbarRef = React.useRef<HTMLDivElement>(null);

  const cancelHide = React.useCallback(() => {
    clearTimeout(hideTimeout.current);
  }, []);

  // Hide after a delay so the pointer can cross the gap to the toolbar.
  const scheduleHide = React.useCallback(() => {
    clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      // Keep the toolbar while it holds keyboard focus.
      if (toolbarRef.current?.contains(document.activeElement)) {
        return;
      }
      setElement(null);
    }, hideDelay);
  }, []);

  React.useEffect(() => cancelHide, [cancelHide]);

  useEventListener(
    "mouseover",
    (event: MouseEvent) => {
      const block =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(`.${EditorStyleHelper.codeBlock}`)
          : null;

      if (block) {
        cancelHide();
        setElement(block);
      } else {
        scheduleHide();
      }
    },
    view.dom
  );
  useEventListener(
    "mouseleave",
    (event: MouseEvent) => {
      // React fires the toolbar's mouseenter before this event, so ignore it
      // when the pointer moves onto the toolbar.
      if (
        event.relatedTarget instanceof Node &&
        toolbarRef.current?.contains(event.relatedTarget)
      ) {
        return;
      }
      scheduleHide();
    },
    view.dom
  );

  if (isMobile || isTouchDevice() || !element || !view.dom.contains(element)) {
    return null;
  }

  const state = editor.editorState;
  const codeBlock = findParentNodeClosestToPos(
    state.doc.resolve(view.posAtDOM(element, 0)),
    isCode
  );
  if (!codeBlock) {
    return null;
  }

  const ctx = buildSelectionContext(state, { readOnly: true, isTemplate, rtl });
  const items = filterExcessSeparators(
    getCodeMenuItems(ctx, codeBlock).filter((item) => item.visible !== false)
  );
  if (!items.length) {
    return null;
  }

  return (
    <StickyBlockToolbar
      ref={toolbarRef}
      items={items}
      rtl={rtl}
      element={element}
      onMouseEnter={cancelHide}
      onMouseLeave={scheduleHide}
    />
  );
});
