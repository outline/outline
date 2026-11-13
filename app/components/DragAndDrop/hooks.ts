import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefCallback,
} from "react";
import shallowEqual from "@shared/utils/shallowEqual";
import {
  DragDropManager,
  type DragItem,
  type DragLayerMonitor,
  type DragSource,
  type DragSourceSpec,
  type DropTarget,
  type DropTargetMonitor,
  type DropTargetSpec,
} from "./DragDropManager";

/** Options for a drop target, with a collector for the props it renders. */
export interface DropTargetHookSpec<
  Item extends DragItem,
  Collected extends object,
> extends DropTargetSpec<Item> {
  /** Returns the props to render. The component re-renders when they change. */
  collect(monitor: DropTargetMonitor): Collected;
}

/** Provides the drag and drop manager to the hooks. */
export const DragDropManagerContext = createContext<DragDropManager>(
  new DragDropManager()
);

/**
 * Makes an element draggable.
 *
 * @param spec The drag source specification.
 * @returns a tuple of whether the element is being dragged and a ref callback for it.
 */
export function useDragRef<Item extends DragItem>(
  spec: DragSourceSpec<Item>
): [boolean, RefCallback<HTMLElement>] {
  const manager = useContext(DragDropManagerContext);
  const specRef = useLatest(spec);
  const [source] = useState<DragSource>(() => ({
    getSpec: () => specRef.current,
  }));

  const ref = useCallback(
    (node: HTMLElement | null) =>
      node ? manager.connectSource(node, source) : undefined,
    [manager, source]
  );

  const isDragging = useSyncExternalStore(manager.subscribe, () =>
    manager.isDragging(source)
  );

  return [isDragging, ref];
}

/**
 * Makes an element a drop target. Targets may be nested; a drop is offered to
 * every hovered target that can accept it, from the innermost outwards.
 *
 * @param spec The drop target specification.
 * @returns a tuple of the collected props and a ref callback for the element.
 */
export function useDropRef<Item extends DragItem, Collected extends object>(
  spec: DropTargetHookSpec<Item, Collected>
): [Collected, RefCallback<HTMLElement>] {
  const manager = useContext(DragDropManagerContext);
  const specRef = useLatest(spec);
  const [target] = useState<DropTarget>(() => ({
    getSpec: () => specRef.current,
  }));
  const [monitor] = useState(() => manager.getTargetMonitor(target));

  const ref = useCallback(
    (node: HTMLElement | null) =>
      node ? manager.connectTarget(node, target) : undefined,
    [manager, target]
  );

  const collected = useCollected(manager.subscribe, () =>
    spec.collect(monitor)
  );

  return [collected, ref];
}

/**
 * Collects props from the global drag state.
 *
 * @param collect Returns the props to render. The component re-renders when they change.
 * @returns the collected props.
 */
export function useDragLayer<Collected extends object>(
  collect: (monitor: DragLayerMonitor) => Collected
): Collected {
  const manager = useContext(DragDropManagerContext);
  return useCollected(manager.subscribe, () => collect(manager.layerMonitor));
}

/**
 * Returns a ref callback for an element that follows the pointer during a
 * drag. The element is moved directly, without a render.
 *
 * @param offsetX The horizontal distance from the pointer.
 * @param offsetY The vertical distance from the pointer.
 * @returns a ref callback for the element.
 */
export function useDragFollower(
  offsetX: number,
  offsetY: number
): RefCallback<HTMLElement> {
  const manager = useContext(DragDropManagerContext);

  return useCallback(
    (node: HTMLElement | null) => {
      if (!node) {
        return undefined;
      }
      const move = () => {
        const pointer = manager.layerMonitor.getClientOffset();
        if (pointer) {
          node.style.transform = `translate(${pointer.x + offsetX}px, ${pointer.y + offsetY}px)`;
        }
      };
      move();
      return manager.subscribeToPointer(move);
    },
    [manager, offsetX, offsetY]
  );
}

/**
 * Returns a ref that always holds the latest value.
 *
 * @param value The value to hold.
 * @returns the ref.
 */
function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * Subscribes to a store and returns the collected value. The previous value is
 * returned while the new one is shallowly equal, so the component only
 * re-renders when a collected prop changes.
 *
 * @param subscribe Subscribes to changes in the store.
 * @param collect Returns the collected value.
 * @returns the collected value.
 */
function useCollected<T extends object>(
  subscribe: (listener: () => void) => () => void,
  collect: () => T
): T {
  const cache = useRef<{ value: T } | null>(null);

  const getSnapshot = () => {
    const value = collect();
    if (
      cache.current &&
      shallowEqual(Object.keys(cache.current.value), Object.keys(value)) &&
      shallowEqual(Object.values(cache.current.value), Object.values(value))
    ) {
      return cache.current.value;
    }
    cache.current = { value };
    return value;
  };

  return useSyncExternalStore(subscribe, getSnapshot);
}
