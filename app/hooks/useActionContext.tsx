import { observer } from "mobx-react";
import type { ReactNode } from "react";
import React, { createContext, useContext } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import useStores from "~/hooks/useStores";
import type Model from "~/models/base/Model";
import type Policy from "~/models/Policy";
import type { ActionContext as ActionContextType } from "~/types";

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

    // Legacy (backward compatibility)
    activeCollectionId: stores.ui.activeCollectionId ?? undefined,
    activeDocumentId: stores.ui.activeDocumentId ?? undefined,

    // New API
    getActiveModels: <T extends Model>(
      modelClass: new (...args: any[]) => T
    ): T[] => stores.ui.getActiveModels<T>(modelClass),

    getActiveModel: <T extends Model>(
      modelClass: new (...args: any[]) => T
    ): T | undefined => stores.ui.getActiveModels<T>(modelClass)[0],

    getActivePolicies: <T extends Model>(
      modelClass: new (...args: any[]) => T
    ): Policy[] =>
      stores.ui
        .getActiveModels<T>(modelClass)
        .map((node) => stores.policies.get(node.id))
        .filter((policy): policy is Policy => policy !== undefined),

    isModelActive: (model: Model): boolean => stores.ui.isModelActive(model),
    activeModels: new Set(stores.ui.activeModels.values()),

    currentUserId: stores.auth.user?.id,
    currentTeamId: stores.auth.team?.id,
    location,
    stores,
    t,
  };

  // Merge the parent context with the provided overrides
  const activeCollectionId =
    value.activeCollectionId ?? baseContext.activeCollectionId;
  const activeDocumentId =
    value.activeDocumentId ?? baseContext.activeDocumentId;

  const getActiveModels = <T extends Model>(
    modelClass: new (...args: any[]) => T
  ): T[] => {
    // @ts-expect-error modelName
    if (activeCollectionId && modelClass.modelName === "Collection") {
      const model = stores.collections.get(activeCollectionId);
      if (model) {
        return [model as unknown as T];
      }
    }

    // @ts-expect-error modelName
    if (activeDocumentId && modelClass.modelName === "Document") {
      const model = stores.documents.get(activeDocumentId);
      if (model) {
        return [model as unknown as T];
      }
    }

    return baseContext.getActiveModels(modelClass);
  };

  const getActiveModel = <T extends Model>(
    modelClass: new (...args: any[]) => T
  ): T | undefined => getActiveModels(modelClass)[0];

  const getActivePolicies = <T extends Model>(
    modelClass: new (...args: any[]) => T
  ): Policy[] =>
    getActiveModels(modelClass)
      .map((node) => stores.policies.get(node.id))
      .filter((policy): policy is Policy => policy !== undefined);

  const contextValue: ActionContextType = {
    ...baseContext,
    ...value,
    getActiveModels,
    getActiveModel,
    getActivePolicies,
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
