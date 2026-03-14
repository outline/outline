import * as React from "react";

type SetSidebarFn = (content: React.ReactNode) => void;

const RightSidebarSetterContext = React.createContext<SetSidebarFn | null>(
  null
);
const RightSidebarContentContext = React.createContext<React.ReactNode>(null);

/**
 * Provider that holds right sidebar content state. Wrap at the layout level
 * so that scenes can set sidebar content via the setter hook.
 */
export function RightSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [content, setContent] = React.useState<React.ReactNode>(null);

  return (
    <RightSidebarSetterContext.Provider value={setContent}>
      <RightSidebarContentContext.Provider value={content}>
        {children}
      </RightSidebarContentContext.Provider>
    </RightSidebarSetterContext.Provider>
  );
}

/**
 * Returns a stable setter function to set the right sidebar content.
 * Used by scenes (e.g. Document) to populate the sidebar.
 */
export function useSetRightSidebar(): SetSidebarFn {
  const setter = React.useContext(RightSidebarSetterContext);
  if (!setter) {
    throw new Error(
      "useSetRightSidebar must be used within a RightSidebarProvider"
    );
  }
  return setter;
}

/**
 * Returns the current right sidebar content. Used by Layout to render
 * the sidebar.
 */
export function useRightSidebarContent(): React.ReactNode {
  return React.useContext(RightSidebarContentContext);
}

/**
 * Context indicating whether the Right sidebar wrapper is already rendered
 * by an ancestor. When true, SidebarLayout skips rendering its own Right
 * wrapper to avoid duplicate animated containers.
 */
export const RightSidebarWrappedContext = React.createContext(false);
