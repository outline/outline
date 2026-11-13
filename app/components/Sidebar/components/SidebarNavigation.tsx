import { observer } from "mobx-react";
import * as React from "react";
import type { NavigationNode } from "@shared/types";
import { useActiveSidebarContext } from "~/hooks/useActiveSidebarContext";
import useKeyDown from "~/hooks/useKeyDown";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import {
  isActiveSidebarContext,
  type SidebarContextType,
} from "./SidebarContext";

/** A sidebar row that keyboard navigation can move to. */
export interface SidebarNavigationItem {
  /** Id of the document or collection that the row links to. */
  id: string;
  /** Path that the row links to. */
  url: string;
  /** Title of the row. */
  title: string;
  /** Sidebar context that the row is rendered in. */
  sidebarContext: SidebarContextType;
  /** Children hidden below the row, when it is collapsed. */
  collapsedChildren?: NavigationNode[];
}

/**
 * Provides keyboard navigation between the rows of the sidebar. Alt+Up and
 * Alt+Down move to the previous and next row, in the order they are shown.
 */
export const SidebarNavigationProvider = observer(
  function SidebarNavigationProvider({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const { ui } = useStores();
    const activeSidebarContext = useActiveSidebarContext();
    const [registry] = React.useState(() => new SidebarNavigationRegistry());

    const handleNavigate = React.useCallback(
      (event: KeyboardEvent) => {
        const activeId = ui.activeDocumentId ?? ui.activeCollectionId;
        if (!activeId) {
          return;
        }
        const items = registry.getItems();
        const index = items.findIndex(
          (item) =>
            item.id === activeId &&
            isActiveSidebarContext(item.sidebarContext, activeSidebarContext)
        );
        if (index === -1) {
          return;
        }
        const offset = event.key === "ArrowUp" ? -1 : 1;
        const item = items[index + offset];
        if (!item) {
          return;
        }

        // Moving up into a collapsed row goes to its last descendant.
        let target: Pick<SidebarNavigationItem, "url" | "title"> = item;
        if (offset < 0 && item.collapsedChildren?.length) {
          let node = item.collapsedChildren[item.collapsedChildren.length - 1];
          while (node.children.length) {
            node = node.children[node.children.length - 1];
          }
          target = node;
        }

        event.preventDefault();
        history.push({
          pathname: target.url,
          state: { title: target.title, sidebarContext: item.sidebarContext },
        });
      },
      [ui, registry, activeSidebarContext]
    );
    useKeyDown(isAltArrow, handleNavigate, keyDownOptions);

    return (
      <SidebarNavigationContext.Provider value={registry}>
        {children}
      </SidebarNavigationContext.Provider>
    );
  }
);

/**
 * Registers sidebar rows for keyboard navigation. The rows are ordered by the
 * position of the element in the sidebar.
 *
 * @param ref the element that contains the rows.
 * @param getItems function that returns the rows, called when a key is pressed.
 */
export function useSidebarNavigation(
  ref: React.RefObject<HTMLElement | null>,
  getItems: () => SidebarNavigationItem[]
): void {
  const registry = React.useContext(SidebarNavigationContext);

  React.useEffect(() => {
    if (!registry) {
      return;
    }
    const entry = { ref, getItems };
    registry.add(entry);
    return () => registry.delete(entry);
  }, [registry, ref, getItems]);
}

interface RegistryEntry {
  ref: React.RefObject<HTMLElement | null>;
  getItems: () => SidebarNavigationItem[];
}

class SidebarNavigationRegistry {
  public add(entry: RegistryEntry) {
    this.entries.add(entry);
  }

  public delete(entry: RegistryEntry) {
    this.entries.delete(entry);
  }

  /**
   * Returns the registered rows in the order they are shown in the sidebar.
   *
   * @returns the rows.
   */
  public getItems(): SidebarNavigationItem[] {
    return [...this.entries]
      .flatMap((entry) =>
        entry.ref.current ? [{ element: entry.ref.current, entry }] : []
      )
      .sort((a, b) =>
        a.element.compareDocumentPosition(b.element) &
        Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1
      )
      .flatMap(({ entry }) => entry.getItems());
  }

  private entries = new Set<RegistryEntry>();
}

const SidebarNavigationContext =
  React.createContext<SidebarNavigationRegistry | null>(null);

// Alt+Shift+Arrow selects text, so other modifiers must not be held.
const isAltArrow = (event: KeyboardEvent) =>
  (event.key === "ArrowUp" || event.key === "ArrowDown") &&
  event.altKey &&
  !event.shiftKey &&
  !event.metaKey &&
  !event.ctrlKey;

// The shortcut also works while the document editor has focus.
const keyDownOptions = { allowInTextInput: true };
