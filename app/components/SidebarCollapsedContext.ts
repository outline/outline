import { createContext, useContext } from "react";

const SidebarCollapsedContext = createContext(false);

/**
 * Provider that reports whether the main sidebar is currently collapsed,
 * taking into account both user preference and whether the current layout
 * allows the sidebar to collapse.
 */
export const SidebarCollapsedProvider = SidebarCollapsedContext.Provider;

/**
 * Returns whether the main sidebar is currently collapsed.
 *
 * @returns true if the sidebar is collapsed.
 */
export function useSidebarCollapsed(): boolean {
  return useContext(SidebarCollapsedContext);
}
