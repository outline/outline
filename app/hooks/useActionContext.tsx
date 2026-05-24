import { observer } from "mobx-react";
import type { ReactNode } from "react";
import React, { createContext, useCallback, useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router";
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

  // Use history (stable reference) and read location lazily via a getter so
  // navigation does not invalidate the context value. Action perform/visible
  // callbacks see the current location at call time via history.location,
  // which react-router updates on every navigation.
  const history = useHistory();

  const {
    activeModels: valueModels,
    isMenu,
    isCommandBar,
    isButton,
    sidebarContext,
    event,
  } = value;

  // Track membership of stores.ui.activeModels so memos invalidate when it changes.
  // Reading inside the observer-wrapped render keeps MobX subscriptions intact.
  const activeModelsKey = Array.from(stores.ui.activeModels.keys()).join(",");
  const activeCollectionIdFromStore = stores.ui.activeCollectionId ?? undefined;
  const activeDocumentIdFromStore = stores.ui.activeDocumentId ?? undefined;
  const currentUserId = stores.auth.user?.id;
  const currentTeamId = stores.auth.team?.id;

  const getActiveModels = useCallback(
    <T extends Model>(modelClass: new (...args: never[]) => T): T[] => {
      if (valueModels && valueModels.length > 0) {
        const matching = valueModels.filter(
          (model): model is T => model instanceof modelClass
        );
        if (matching.length > 0) {
          return matching;
        }
      }
      if (parentContext) {
        return parentContext.getActiveModels(modelClass);
      }
      return stores.ui.getActiveModels<T>(modelClass);
    },
    [valueModels, parentContext, stores]
  );

  const getActiveModel = useCallback(
    <T extends Model>(modelClass: new (...args: never[]) => T): T | undefined =>
      getActiveModels(modelClass)[0],
    [getActiveModels]
  );

  const getActivePolicies = useCallback(
    <T extends Model>(modelClass: new (...args: never[]) => T): Policy[] =>
      getActiveModels(modelClass)
        .map((node) => stores.policies.get(node.id))
        .filter((policy): policy is Policy => policy !== undefined),
    [getActiveModels, stores]
  );

  const allActiveModels = useMemo(() => {
    const base = parentContext
      ? parentContext.activeModels
      : new Set(stores.ui.activeModels.values());
    if (valueModels && valueModels.length > 0) {
      return new Set([...base, ...valueModels]);
    }
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentContext, stores, valueModels, activeModelsKey]);

  const isModelActive = useCallback(
    (model: Model): boolean => allActiveModels.has(model),
    [allActiveModels]
  );

  const contextValue = useMemo<ActionContextType>(() => {
    const baseContext: ActionContextType = parentContext ?? {
      isMenu: false,
      isCommandBar: false,
      isButton: false,

      // Legacy (backward compatibility)
      activeCollectionId: activeCollectionIdFromStore,
      activeDocumentId: activeDocumentIdFromStore,

      getActiveModels,
      getActiveModel,
      getActivePolicies,
      isModelActive,
      activeModels: allActiveModels,

      currentUserId,
      currentTeamId,
      // Consumers reading `ctx.location` get the current location at access time.
      location: history.location,
      stores,
      t,
    };

    // Derive legacy IDs from value models, falling back to base context
    const activeCollectionId =
      valueModels?.find(
        (m) => (m.constructor as typeof Model).modelName === "Collection"
      )?.id ?? baseContext.activeCollectionId;

    const activeDocumentId =
      valueModels?.find(
        (m) => (m.constructor as typeof Model).modelName === "Document"
      )?.id ?? baseContext.activeDocumentId;

    const result = {
      ...baseContext,
      ...(isMenu !== undefined ? { isMenu } : {}),
      ...(isCommandBar !== undefined ? { isCommandBar } : {}),
      ...(isButton !== undefined ? { isButton } : {}),
      ...(sidebarContext !== undefined ? { sidebarContext } : {}),
      ...(event !== undefined ? { event } : {}),
      activeCollectionId,
      activeDocumentId,
      getActiveModels,
      getActiveModel,
      getActivePolicies,
      isModelActive,
      activeModels: allActiveModels,
    };

    // Define `location` as a getter so reads always return the current
    // location without invalidating this memo on navigation.
    Object.defineProperty(result, "location", {
      get: () => history.location,
      enumerable: true,
      configurable: true,
    });

    return result;
  }, [
    parentContext,
    stores,
    t,
    history,
    valueModels,
    isMenu,
    isCommandBar,
    isButton,
    sidebarContext,
    event,
    activeCollectionIdFromStore,
    activeDocumentIdFromStore,
    currentUserId,
    currentTeamId,
    getActiveModels,
    getActiveModel,
    getActivePolicies,
    isModelActive,
    allActiveModels,
  ]);

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

  if (!contextValue) {
    throw new Error(
      "useActionContext must be used within an ActionContextProvider"
    );
  }

  // Short-circuit when no overrides are provided so consumers get a stable
  // reference and don't re-render unnecessarily.
  if (!overrides || Object.keys(overrides).length === 0) {
    return contextValue;
  }

  return {
    ...contextValue,
    ...overrides,
  };
}
