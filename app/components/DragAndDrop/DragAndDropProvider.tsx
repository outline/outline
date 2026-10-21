import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type Announcements,
} from "@dnd-kit/core";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import {
  DragDropManager,
  type DragSource,
  type Point,
} from "./DragDropManager";
import { DragDropManagerContext } from "./hooks";

interface Props {
  children: ReactNode;
}

/**
 * Provides drag and drop to the hooks in this module. dnd-kit detects and
 * tracks the drag; the manager resolves the drop targets under the pointer.
 */
export function DragAndDropProvider({ children }: Props) {
  const { t } = useTranslation();
  const [manager] = useState(() => new DragDropManager());
  const activatorRef = useRef<Activator | null>(null);
  const pendingRef = useRef<{ source: DragSource; pointer: Point } | null>(
    null
  );
  const sessionRef = useRef<(() => void) | null>(null);
  const titleRef = useRef("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // A single dnd-kit draggable is moved to the source under the pointer, so
  // that dnd-kit context changes do not re-render every source. DndContext
  // does not wrap the children, as its context changes on every move.
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      // Touch gestures scroll the sidebar and swipe it closed instead.
      if (
        event.pointerType === "touch" ||
        !(event.target instanceof Element) ||
        event.target.closest(EDITABLE_SELECTOR)
      ) {
        return;
      }
      const found = manager.findSource(event.target);
      if (!found || !activatorRef.current) {
        return;
      }
      pendingRef.current = {
        source: found.source,
        pointer: { x: event.clientX, y: event.clientY },
      };
      activatorRef.current(found.node, event);
    };

    // Runs before the sensor, so the move that starts a drag is included.
    const handlePendingMove = (event: PointerEvent) => {
      if (pendingRef.current) {
        pendingRef.current.pointer = { x: event.clientX, y: event.clientY };
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePendingMove, {
      capture: true,
      passive: true,
    });
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePendingMove, {
        capture: true,
      });
    };
  }, [manager]);

  const handleDragStart = useCallback(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) {
      return;
    }
    manager.beginDrag(pending.source);
    titleRef.current = manager.layerMonitor.getItem()?.title ?? "";
    sessionRef.current = startDragSession(manager, pending.pointer);
  }, [manager]);

  const endSession = useCallback(() => {
    sessionRef.current?.();
    sessionRef.current = null;
  }, []);

  const handleDragEnd = useCallback(() => {
    endSession();
    manager.drop();
  }, [manager, endSession]);

  const handleDragCancel = useCallback(() => {
    endSession();
    manager.endDrag();
  }, [manager, endSession]);

  const handleDragAbort = useCallback(() => {
    pendingRef.current = null;
  }, []);

  useEffect(() => handleDragCancel, [handleDragCancel]);

  const accessibility = useMemo(() => {
    const announcements: Announcements = {
      onDragStart: () =>
        t("Picked up {{ title }}", { title: titleRef.current }),
      onDragOver: () => undefined,
      onDragEnd: () => t("Dropped {{ title }}", { title: titleRef.current }),
      onDragCancel: () =>
        t("Cancelled dragging {{ title }}", { title: titleRef.current }),
    };
    return {
      announcements,
      screenReaderInstructions: { draggable: "" },
    };
  }, [t]);

  return (
    <DragDropManagerContext.Provider value={manager}>
      <DndContext
        sensors={sensors}
        autoScroll={false}
        accessibility={accessibility}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        onDragAbort={handleDragAbort}
      >
        <DragActivator activatorRef={activatorRef} />
      </DndContext>
      {children}
    </DragDropManagerContext.Provider>
  );
}

type Activator = (node: HTMLElement, event: PointerEvent) => void;

const DRAGGABLE_ID = "drag-source";

// Drags must not start from controls where the pointer selects text.
const EDITABLE_SELECTOR =
  "input, textarea, select, [contenteditable='true'], [role='textbox']";

const POINTER_EVENTS = ["pointermove", "pointerup"];

// Mouse hover and move handlers do not run during a drag, as with a native
// drag. The drag itself is tracked with pointer events.
const MOUSE_EVENTS = [
  "pointerover",
  "pointerout",
  "mouseover",
  "mouseout",
  "mousemove",
];

// Distance from the edge of a scroll container where dragging scrolls it.
const SCROLL_EDGE = 48;

// Scroll distance of one wheel line.
const LINE_HEIGHT = 16;

// Maximum scroll distance per frame.
const SCROLL_SPEED = 14;

/**
 * Hosts the dnd-kit draggable and exposes a function that starts the dnd-kit
 * sensor for a source element.
 */
function DragActivator({
  activatorRef,
}: {
  activatorRef: RefObject<Activator | null>;
}) {
  const { setNodeRef, listeners } = useDraggable({ id: DRAGGABLE_ID });

  useEffect(() => {
    activatorRef.current = (node, event) => {
      setNodeRef(node);
      listeners?.onPointerDown?.({ nativeEvent: event });
    };
    return () => {
      activatorRef.current = null;
    };
  }, [activatorRef, listeners, setNodeRef]);

  return null;
}

/**
 * Tracks the pointer during a drag, updates the hovered targets, scrolls the
 * container under the pointer near its edges, blocks hover styles and
 * handlers, and swallows the click that follows the drop.
 *
 * @param manager The drag and drop manager.
 * @param initialPointer The pointer position where the drag started.
 * @returns a function that ends the session.
 */
function startDragSession(
  manager: DragDropManager,
  initialPointer: Point
): () => void {
  let pointer = initialPointer;
  let hovered: Element | null = null;
  let scroller: HTMLElement | null = null;
  let scrollerRect: DOMRect | undefined;
  let frame = 0;

  // A transparent layer takes the pointer so that no element shows a hover
  // style, as with a native drag. Hit testing looks through it.
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position: fixed; inset: 0; z-index: 2147483647; cursor: grabbing;";
  document.body.appendChild(overlay);

  const update = () => {
    const element =
      document
        .elementsFromPoint(pointer.x, pointer.y)
        .find((el) => el !== overlay) ?? null;
    if (element !== hovered) {
      hovered = element;
      scroller = getScrollContainer(element);
      scrollerRect = scroller?.getBoundingClientRect();
    }
    manager.hover(element, pointer);
  };

  const handlePointerMove = (event: PointerEvent) => {
    pointer = { x: event.clientX, y: event.clientY };
    update();
  };

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const stopPropagation = (event: Event) => event.stopPropagation();

  const handleWheel = (event: WheelEvent) => {
    if (!scroller) {
      return;
    }
    event.preventDefault();
    scroller.scrollTop +=
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? event.deltaY * LINE_HEIGHT
        : event.deltaY;
  };

  const scroll = () => {
    frame = requestAnimationFrame(scroll);
    if (!scroller || !scrollerRect) {
      return;
    }
    const speed =
      getScrollSpeed(scrollerRect.bottom - pointer.y) -
      getScrollSpeed(pointer.y - scrollerRect.top);
    if (speed) {
      scroller.scrollTop += speed;
    }
  };

  // The release position is checked too, before the sensor ends the drag.
  for (const type of POINTER_EVENTS) {
    window.addEventListener(type, handlePointerMove, {
      capture: true,
      passive: true,
    });
  }
  window.addEventListener("scroll", update, { capture: true, passive: true });
  window.addEventListener("click", handleClick, { capture: true });
  for (const type of MOUSE_EVENTS) {
    window.addEventListener(type, stopPropagation, { capture: true });
  }
  overlay.addEventListener("wheel", handleWheel, { passive: false });
  update();
  frame = requestAnimationFrame(scroll);

  return () => {
    for (const type of POINTER_EVENTS) {
      window.removeEventListener(type, handlePointerMove, { capture: true });
    }
    window.removeEventListener("scroll", update, { capture: true });
    for (const type of MOUSE_EVENTS) {
      window.removeEventListener(type, stopPropagation, { capture: true });
    }
    cancelAnimationFrame(frame);
    overlay.remove();
    setTimeout(
      () => window.removeEventListener("click", handleClick, { capture: true }),
      50
    );
  };
}

/**
 * Returns the nearest ancestor of the element that scrolls vertically.
 *
 * @param element The element to start from.
 * @returns the scroll container, or null if there is none.
 */
function getScrollContainer(element: Element | null): HTMLElement | null {
  let current = element;
  while (current && current !== document.body) {
    if (
      current instanceof HTMLElement &&
      current.scrollHeight > current.clientHeight &&
      /(auto|scroll|overlay)/.test(getComputedStyle(current).overflowY)
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

/**
 * Returns the scroll distance for one frame.
 *
 * @param distance The distance from the pointer to the edge of the container.
 * @returns the scroll distance, 0 when the pointer is not near the edge.
 */
function getScrollSpeed(distance: number): number {
  return SCROLL_SPEED * Math.max(0, 1 - Math.max(distance, 0) / SCROLL_EDGE);
}
