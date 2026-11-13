import { action, autorun, makeObservable, observable } from "mobx";
import { createContext, useContext, useEffect, useState } from "react";
import type { NavigationNode } from "@shared/types";
import useStores from "~/hooks/useStores";

/**
 * Computes the set of node IDs along the path from any node in `roots` down
 * to a node with `targetId`, inclusive of both endpoints. Returns an empty
 * array when no path exists.
 *
 * @param roots the top-level navigation nodes to search through.
 * @param targetId the id of the target document.
 * @returns array of ancestor IDs (inclusive of the target).
 */
function computeAncestorPath(
  roots: NavigationNode[],
  targetId: string
): string[] {
  const stack: string[] = [];
  let found = false;
  const search = (nodes: NavigationNode[]): boolean => {
    for (const node of nodes) {
      stack.push(node.id);
      if (node.id === targetId) {
        found = true;
        return true;
      }
      if (node.children.length && search(node.children)) {
        return true;
      }
      stack.pop();
    }
    return false;
  };
  search(roots);
  return found ? stack : [];
}

/**
 * Manages the set of expanded node IDs for a sidebar document tree.
 *
 * Uses a MobX ObservableMap, which tracks `has` per key, so that individual
 * `observer`-wrapped DocumentLinks only re-render when their own node is
 * expanded or collapsed, rather than on every expansion change in the tree.
 */
export class SidebarExpansionState {
  expandedIds = observable.map<string, true>();

  constructor() {
    makeObservable(this);
  }

  /**
   * Whether a given node is currently expanded.
   *
   * @param nodeId the id of the node to check.
   * @returns true if the node is expanded.
   */
  isExpanded(nodeId: string): boolean {
    return this.expandedIds.has(nodeId);
  }

  /**
   * Expand a single node.
   *
   * @param nodeId the id of the node to expand.
   */
  @action
  expand(nodeId: string): void {
    this.expandedIds.set(nodeId, true);
  }

  /**
   * Collapse a single node.
   *
   * @param nodeId the id of the node to collapse.
   */
  @action
  collapse(nodeId: string): void {
    this.expandedIds.delete(nodeId);
  }

  /**
   * Expand a node and all of its descendants recursively.
   *
   * @param node the root NavigationNode to expand.
   */
  @action
  expandDescendants(node: NavigationNode): void {
    const walk = (n: NavigationNode) => {
      this.expandedIds.set(n.id, true);
      for (const child of n.children) {
        walk(child);
      }
    };
    walk(node);
  }

  /**
   * Collapse a node and all of its descendants recursively.
   *
   * @param node the root NavigationNode to collapse.
   */
  @action
  collapseDescendants(node: NavigationNode): void {
    const walk = (n: NavigationNode) => {
      this.expandedIds.delete(n.id);
      for (const child of n.children) {
        walk(child);
      }
    };
    walk(node);
  }

  /**
   * Expand all nodes along a path (e.g. ancestors of the active document).
   *
   * @param ids the node IDs to expand.
   */
  @action
  expandPath(ids: Iterable<string>): void {
    for (const id of ids) {
      this.expandedIds.set(id, true);
    }
  }

  /**
   * Expand every node in the given roots, recursively.
   *
   * @param roots the top-level navigation nodes.
   */
  @action
  expandAll(roots: NavigationNode[]): void {
    const walk = (nodes: NavigationNode[]) => {
      for (const node of nodes) {
        this.expandedIds.set(node.id, true);
        walk(node.children);
      }
    };
    walk(roots);
  }

  /**
   * Collapse every node by clearing the set.
   */
  @action
  collapseAll(): void {
    this.expandedIds.clear();
  }
}

/**
 * Context for providing a SidebarExpansionState to descendant sidebar
 * components. Each document tree root (collection, starred doc, shared
 * membership) creates its own instance so expansion state is scoped.
 */
const SidebarExpansionContext = createContext<SidebarExpansionState | null>(
  null
);

/**
 * Hook to consume the nearest SidebarExpansionState from context.
 *
 * @returns the expansion state instance.
 */
export function useSidebarExpansion(): SidebarExpansionState {
  const ctx = useContext(SidebarExpansionContext);
  if (!ctx) {
    throw new Error(
      "useSidebarExpansion must be used within a SidebarExpansionContext.Provider"
    );
  }
  return ctx;
}

/**
 * Hook that creates a SidebarExpansionState and auto-expands the path
 * to the active document whenever it changes. Returns the state instance
 * to be provided via SidebarExpansionContext.Provider.
 *
 * @param roots the top-level navigation nodes (e.g. collection documents).
 * @returns the expansion state instance.
 */
export function useSidebarExpansionState(
  roots: NavigationNode[] | undefined
): SidebarExpansionState {
  const { ui } = useStores();
  const [state] = useState(() => new SidebarExpansionState());

  // The active document is read in a reaction rather than during render, so
  // that the component does not re-render on every navigation.
  useEffect(() => {
    if (!roots) {
      return;
    }
    return autorun(() => {
      const activeDocumentId = ui.activeDocumentId;
      if (!activeDocumentId) {
        return;
      }
      const path = computeAncestorPath(roots, activeDocumentId);
      if (path.length > 0) {
        state.expandPath(path);
      }
    });
  }, [state, roots, ui]);

  return state;
}

export default SidebarExpansionContext;
