import { observer } from "mobx-react";
import type { ReactNode } from "react";
import React, { createContext, useContext } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import useStores from "~/hooks/useStores";
import type Model from "~/models/base/Model";
import type Policy from "~/models/Policy";
import type { ActionContext as ActionContextType } from "~/types";
import type { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";

export const ActionContext = createContext<ActionContextType | undefined>(
  undefined
);

interface ActionContextProviderValue {
  /** Models to add to the active models context for this subtree. */
  activeModels?: Model[];
  isMenu?: boolean;
  isCommandBar?: boolean;
  isButton?: boolean;
  sidebarContext?: SidebarContextType;
  event?: Event;
}

type ActionContextProviderProps = {
  children: ReactNode;
  value?: ActionContextProviderValue;
};

/**
 * Provider that allows overriding the action context at different levels
 * of the React component tree.
 *
 * @example
 * ```tsx
 * // Override active models for a collection menu
 * <ActionContextProvider value={{ activeModels: [collection] }}>
 *   <CollectionMenu />
 * </ActionContextProvider>
 *
 * // Nested overrides
 * <ActionContextProvider value={{ activeModels: [collection] }}>
 *   <CollectionView />
 *   <ActionContextProvider value={{ activeModels: [document] }}>
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
  const { activeModels: valueModels, ...overrides } = value;

  // Create the base context if we don't have a parent context
  const baseContext: ActionContextType = parentContext ?? {
    isMenu: false,
    isCommandBar: false,
    isButton: false,

    // Legacy (backward compatibility)
    activeCollectionId: stores.ui.activeCollectionId ?? undefined,
    activeDocumentId: stores.ui.activeDocumentId ?? undefined,

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

  // Override model accessors when models are provided in value
  const getActiveModels =
    valueModels && valueModels.length > 0
      ? <T extends Model>(modelClass: new (...args: any[]) => T): T[] => {
          const matching = valueModels.filter(
            (model): model is T => model instanceof modelClass
          );
          return matching.length > 0
            ? matching
            : baseContext.getActiveModels(modelClass);
        }
      : baseContext.getActiveModels;

  const getActiveModel = <T extends Model>(
    modelClass: new (...args: any[]) => T
  ): T | undefined => getActiveModels(modelClass)[0];

  const getActivePolicies = <T extends Model>(
    modelClass: new (...args: any[]) => T
  ): Policy[] =>
    getActiveModels(modelClass)
      .map((node) => stores.policies.get(node.id))
      .filter((policy): policy is Policy => policy !== undefined);

  const allActiveModels =
    valueModels && valueModels.length > 0
      ? new Set([...baseContext.activeModels, ...valueModels])
      : baseContext.activeModels;

  const isModelActive = (model: Model): boolean => allActiveModels.has(model);

  // Derive legacy IDs from value models, falling back to base context
  const activeCollectionId =
    valueModels?.find(
      (m) => (m.constructor as typeof Model).modelName === "Collection"
    )?.id ?? baseContext.activeCollectionId;

  const activeDocumentId =
    valueModels?.find(
      (m) => (m.constructor as typeof Model).modelName === "Document"
    )?.id ?? baseContext.activeDocumentId;

  const contextValue: ActionContextType = {
    ...baseContext,
    ...overrides,
    activeCollectionId,
    activeDocumentId,
    getActiveModels,
    getActiveModel,
    getActivePolicies,
    isModelActive,
    activeModels: allActiveModels,
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
