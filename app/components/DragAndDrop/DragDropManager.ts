import type { ReactNode } from "react";
import shallowEqual from "@shared/utils/shallowEqual";

/** A position in viewport coordinates. */
export interface Point {
  x: number;
  y: number;
}

/** The data carried by a drag operation. */
export interface DragItem {
  /** The id of the dragged model. */
  id: string;
  /** The title shown in the drag preview. */
  title?: string;
  /** The icon shown in the drag preview. */
  icon?: ReactNode;
  /** Whether the dragged model is a draft. */
  isDraft?: boolean;
}

/** Reads the drag state for a drop target. */
export interface DropTargetMonitor {
  /**
   * Whether the pointer is over this target. With `shallow`, only when no
   * nested target that accepts the item is between them.
   */
  isOver(options?: { shallow?: boolean }): boolean;
  /** Whether the dragged item can be dropped on this target. */
  canDrop(): boolean;
  /** Whether a nested target has already handled the current drop. */
  didDrop(): boolean;
  /** The type of the dragged item, or null when nothing is dragged. */
  getItemType(): string | null;
}

/** Reads the global drag state. */
export interface DragLayerMonitor {
  /** Whether an item is being dragged. */
  isDragging(): boolean;
  /** The dragged item, or null when nothing is dragged. */
  getItem(): DragItem | null;
  /** The pointer position, or null when nothing is dragged. */
  getClientOffset(): Point | null;
}

/** Describes an element that can be dragged. */
export interface DragSourceSpec<Item extends DragItem> {
  /** The type of the dragged item, matched against a target's `accept`. */
  type: string;
  /** Returns the item that drop targets receive. */
  item(): Item;
  /** Whether the source can be dragged now. */
  canDrag?(): boolean;
}

/** Describes an element that dragged items can be dropped on. */
export interface DropTargetSpec<Item extends DragItem> {
  /** The item types that the target accepts. */
  accept: string | string[];
  /** Whether the item can be dropped on the target. */
  canDrop?(item: Item, monitor: DropTargetMonitor): boolean;
  /** Called while an accepted item is over the target. */
  hover?(item: Item, monitor: DropTargetMonitor): void;
  /** Called when the item is dropped on the target. */
  drop?(item: Item, monitor: DropTargetMonitor): unknown;
}

/** A registered drag source. */
export interface DragSource {
  /** Returns the latest source specification. */
  getSpec(): DragSourceSpec<DragItem>;
}

/** A registered drop target. */
export interface DropTarget {
  /** Returns the latest target specification. */
  getSpec(): DropTargetSpec<DragItem>;
}

interface DragOperation {
  source: DragSource;
  type: string;
  item: DragItem;
}

const EMPTY_TARGETS: DropTarget[] = [];

/**
 * Holds the connected drag sources and drop targets, and the state of the
 * current drag operation. Nested drop targets are resolved from the DOM: all
 * connected targets that contain the element under the pointer are hovered,
 * and a drop is offered to each of them from the innermost outwards.
 */
export class DragDropManager {
  /** A monitor for the global drag state. */
  public readonly layerMonitor: DragLayerMonitor = {
    isDragging: () => !!this.operation,
    getItem: () => this.operation?.item ?? null,
    getClientOffset: () => this.pointer,
  };

  /**
   * Subscribes to changes in the drag operation and the hovered targets.
   *
   * @param listener Called after each change.
   * @returns a function that removes the listener.
   */
  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Subscribes to changes in the pointer position.
   *
   * @param listener Called after each change.
   * @returns a function that removes the listener.
   */
  public subscribeToPointer = (listener: () => void) => {
    this.pointerListeners.add(listener);
    return () => {
      this.pointerListeners.delete(listener);
    };
  };

  /**
   * Connects a drag source to its DOM element.
   *
   * @param node The element.
   * @param source The source.
   * @returns a function that disconnects the source.
   */
  public connectSource(node: HTMLElement, source: DragSource): () => void {
    this.sources.set(node, source);
    return () => {
      if (this.sources.get(node) === source) {
        this.sources.delete(node);
      }
    };
  }

  /**
   * Connects a drop target to its DOM element.
   *
   * @param node The element.
   * @param target The target.
   * @returns a function that disconnects the target.
   */
  public connectTarget(node: Element, target: DropTarget): () => void {
    const targets = this.targets.get(node) ?? new Set<DropTarget>();
    targets.add(target);
    this.targets.set(node, targets);
    return () => {
      targets.delete(target);
      if (this.hovered.includes(target)) {
        this.hovered = this.hovered.filter((t) => t !== target);
        this.emit();
      }
    };
  }

  /**
   * Returns the nearest source connected to the element or one of its
   * ancestors that can be dragged now.
   *
   * @param element The element where the drag starts.
   * @returns the source and its element, or undefined if none can be dragged.
   */
  public findSource(
    element: Element
  ): { source: DragSource; node: HTMLElement } | undefined {
    for (let node: Element | null = element; node; node = node.parentElement) {
      const source = this.sources.get(node);
      if (
        source &&
        node instanceof HTMLElement &&
        (source.getSpec().canDrag?.() ?? true)
      ) {
        return { source, node };
      }
    }
    return undefined;
  }

  /**
   * Starts a drag operation.
   *
   * @param source The dragged source.
   */
  public beginDrag(source: DragSource) {
    const spec = source.getSpec();
    this.operation = { source, type: spec.type, item: spec.item() };
    this.hovered = EMPTY_TARGETS;
    this.dropped = false;
    this.emit();
  }

  /**
   * Updates the pointer position and the hovered targets.
   *
   * @param element The element under the pointer.
   * @param pointer The pointer position.
   */
  public hover(element: Element | null, pointer: Point) {
    const operation = this.operation;
    if (!operation) {
      return;
    }

    this.pointer = pointer;
    this.pointerListeners.forEach((listener) => listener());

    const hovered: DropTarget[] = [];
    for (let node = element; node; node = node.parentElement) {
      for (const target of this.targets.get(node) ?? EMPTY_TARGETS) {
        if (accepts(target, operation.type)) {
          hovered.push(target);
        }
      }
    }
    if (!shallowEqual(hovered, this.hovered)) {
      this.hovered = hovered.length ? hovered : EMPTY_TARGETS;
      this.emit();
    }

    for (const target of this.hovered) {
      target.getSpec().hover?.(operation.item, this.getTargetMonitor(target));
    }
  }

  /**
   * Offers the dragged item to the hovered targets that can accept it, from
   * the innermost outwards, then ends the drag.
   */
  public drop() {
    const operation = this.operation;
    if (!operation) {
      return;
    }

    try {
      for (const target of this.hovered) {
        if (this.canDrop(target)) {
          const monitor = this.getTargetMonitor(target);
          target.getSpec().drop?.(operation.item, monitor);
          this.dropped = true;
        }
      }
    } finally {
      this.endDrag();
    }
  }

  /** Ends the drag operation without a drop. */
  public endDrag() {
    if (!this.operation) {
      return;
    }
    this.operation = null;
    this.pointer = null;
    this.hovered = EMPTY_TARGETS;
    this.emit();
    this.pointerListeners.forEach((listener) => listener());
  }

  /**
   * Returns whether the source is being dragged.
   *
   * @param source The source.
   * @returns true if the source is dragged.
   */
  public isDragging(source: DragSource): boolean {
    return this.operation?.source === source;
  }

  /**
   * Returns a monitor for a drop target.
   *
   * @param target The target.
   * @returns the monitor.
   */
  public getTargetMonitor(target: DropTarget): DropTargetMonitor {
    return {
      isOver: (options) =>
        options?.shallow
          ? this.hovered[0] === target
          : this.hovered.includes(target),
      canDrop: () => this.canDrop(target),
      didDrop: () => this.dropped,
      getItemType: () => this.operation?.type ?? null,
    };
  }

  private canDrop(target: DropTarget): boolean {
    const operation = this.operation;
    if (!operation || !accepts(target, operation.type)) {
      return false;
    }
    return (
      target
        .getSpec()
        .canDrop?.(operation.item, this.getTargetMonitor(target)) ?? true
    );
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  private operation: DragOperation | null = null;

  private pointer: Point | null = null;

  /** Hovered targets, from the innermost outwards. */
  private hovered = EMPTY_TARGETS;

  private dropped = false;

  private sources = new WeakMap<Element, DragSource>();

  private targets = new WeakMap<Element, Set<DropTarget>>();

  private listeners = new Set<() => void>();

  private pointerListeners = new Set<() => void>();
}

function accepts(target: DropTarget, type: string): boolean {
  const { accept } = target.getSpec();
  return Array.isArray(accept) ? accept.includes(type) : accept === type;
}
