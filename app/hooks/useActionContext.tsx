import { observer } from "mobx-react";
import React, { createContext, useContext, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import useStores from "~/hooks/useStores";
import { ActionContext as ActionContextType } from "~/types";

export const ActionContext = createContext<ActionContextType | undefined>(
  undefined
);

type ActionContextProviderProps = {
  children: ReactNode;
  value?: Partial<ActionContextType>;
};

/**
 * Provider that allows overriding the action context at different levels
 * of the React component tree.
 *
 * @example
 * ```tsx
 * // Override context for a command bar
 * <ActionContextProvider value={{ isCommandBar: true }}>
 *   <CommandBar />
 * </ActionContextProvider>
 *
 * // Nested overrides
 * <ActionContextProvider value={{ activeCollectionId: "collection-1" }}>
 *   <CollectionView />
 *   <ActionContextProvider value={{ activeDocumentId: "doc-1" }}>
 *     <DocumentView />
 *   </ActionContextProvider>
 * </ActionContextProvider>
 * ```
 */
export const ActionContextProvider = observer(function ActionContextProvider_({
  children,
  value = {},
}: ActionContextProviderProps) {
  const parentContext = useContext(ActionContext);
  const stores = useStores();
  const { t } = useTranslation();
  const location = useLocation();

  // Create the base context if we don't have a parent context
  const baseContext: ActionContextType = parentContext ?? {
    isMenu: false,
    isCommandBar: false,
    isButton: false,
    activeCollectionId: stores.ui.activeCollectionId ?? undefined,
    activeDocumentId: stores.ui.activeDocumentId ?? undefined,
    currentUserId: stores.auth.user?.id,
    currentTeamId: stores.auth.team?.id,
    location,
    stores,
    t,
  };

  // Merge the parent context with the provided overrides
  const contextValue: ActionContextType = {
    ...baseContext,
    ...value,
  };

  return (
    <ActionContext.Provider value={contextValue}>
      {children}
    </ActionContext.Provider>
  );
});

/**
 * Hook to get the current action context, an object that is passed to all
 * action definitions.
 *
 * This hook respects the ActionContextProvider hierarchy, merging values from:
 * 1. Default system context (stores, location, translation)
 * 2. Parent ActionContextProvider values (if any)
 * 3. Local overrides parameter (highest priority)
 *
 * @param overrides Optional overrides of the action context. These will be
 *                 merged with any provider context and take highest priority.
 * @returns The current action context with all overrides applied.
 */
export default function useActionContext(
  overrides?: Partial<ActionContextType>
): ActionContextType {
  const contextValue = useContext(ActionContext);

  // If we have a context value from a provider, use it as the base
  if (contextValue) {
    return {
      ...contextValue,
      ...overrides,
    };
  }

  throw new Error(
    "useActionContext must be used within an ActionContextProvider"
  );
}
