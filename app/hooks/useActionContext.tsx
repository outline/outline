import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router";
import shallowEqual from "@shared/utils/shallowEqual";
import useStores from "~/hooks/useStores";
import type Model from "~/models/base/Model";
import type Policy from "~/models/Policy";
import type { ActionContext as ActionContextType } from "~/types";
import type { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";

export const ActionContext = createContext<ActionContextType | undefined>(
  undefined
);

const EMPTY_MODELS: Model[] = [];

const EMPTY_OVERRIDES: Partial<ActionContextType> = {};

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
export function ActionContextProvider({
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
  const history = useHistory<{ sidebarContext?: SidebarContextType }>();

  const { isMenu, isCommandBar, isButton, sidebarContext, event } = value;
  const valueModels = useStableValue(value.activeModels ?? EMPTY_MODELS);

  // Values derived from the UI store are getters, so that the context value
  // stays the same when the active document changes. Observers that read them
  // still re-render, as the store is observable.
  const contextValue = useMemo<ActionContextType>(() => {
    const getActiveModels = <T extends Model>(
      modelClass: new (...args: never[]) => T
    ): T[] => {
      const matching = valueModels.filter(
        (model): model is T => model instanceof modelClass
      );
      if (matching.length > 0) {
        return matching;
      }
      if (parentContext) {
        return parentContext.getActiveModels(modelClass);
      }
      return stores.ui.getActiveModels<T>(modelClass);
    };

    const getActiveModel = <T extends Model>(
      modelClass: new (...args: never[]) => T
    ): T | undefined => getActiveModels(modelClass)[0];

    const getActivePolicies = <T extends Model>(
      modelClass: new (...args: never[]) => T
    ): Policy[] =>
      getActiveModels(modelClass)
        .map((node) => stores.policies.get(node.id))
        .filter((policy): policy is Policy => policy !== undefined);

    const isModelActive = (model: Model): boolean =>
      valueModels.includes(model) ||
      (parentContext
        ? parentContext.isModelActive(model)
        : stores.ui.isModelActive(model));

    const findValueModelId = (modelName: string) =>
      valueModels.find(
        (m) => (m.constructor as typeof Model).modelName === modelName
      )?.id;
    const valueCollectionId = findValueModelId("Collection");
    const valueDocumentId = findValueModelId("Document");

    const baseContext: ActionContextType = parentContext ?? {
      isMenu: false,
      isCommandBar: false,
      isButton: false,
      get activeCollectionId() {
        return stores.ui.activeCollectionId ?? undefined;
      },
      get activeDocumentId() {
        return stores.ui.activeDocumentId ?? undefined;
      },
      get activeModels() {
        return new Set(stores.ui.activeModels.values());
      },
      get currentUserId() {
        return stores.auth.user?.id;
      },
      get currentTeamId() {
        return stores.auth.team?.id;
      },
      get location() {
        return history.location;
      },
      get sidebarContext() {
        return history.location.state?.sidebarContext;
      },
      getActiveModels,
      getActiveModel,
      getActivePolicies,
      isModelActive,
      stores,
      t,
    };

    return mergeLazy<ActionContextType>(baseContext, {
      ...(isMenu !== undefined ? { isMenu } : {}),
      ...(isCommandBar !== undefined ? { isCommandBar } : {}),
      ...(isButton !== undefined ? { isButton } : {}),
      ...(event !== undefined ? { event } : {}),

      // Read from this provider's history, which is the pane's own history
      // inside a split view.
      get location() {
        return history.location;
      },
      get sidebarContext() {
        return (
          sidebarContext ??
          parentContext?.sidebarContext ??
          history.location.state?.sidebarContext
        );
      },
      get activeCollectionId() {
        return valueCollectionId ?? baseContext.activeCollectionId;
      },
      get activeDocumentId() {
        return valueDocumentId ?? baseContext.activeDocumentId;
      },
      get activeModels() {
        const base = baseContext.activeModels;
        return valueModels.length > 0
          ? new Set([...base, ...valueModels])
          : base;
      },
      getActiveModels,
      getActiveModel,
      getActivePolicies,
      isModelActive,
    });
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
  ]);

  return (
    <ActionContext.Provider value={contextValue}>
      {children}
    </ActionContext.Provider>
  );
}

/**
 * Merges objects in the same way as an object spread, but copies property
 * descriptors so that getters are kept and evaluated on access.
 *
 * @param base the object to extend.
 * @param overrides the properties that replace those of `base`.
 * @returns a new object with the properties of both.
 */
function mergeLazy<T extends object>(base: T, overrides: Partial<T>): T {
  return Object.defineProperties({} as T, {
    ...Object.getOwnPropertyDescriptors(base),
    ...Object.getOwnPropertyDescriptors(overrides),
  });
}

/**
 * Returns the same object reference across calls as long as `value`'s own
 * enumerable properties are shallowly equal to the previous call's. Callers
 * that pass overrides to `useActionContext` supply a fresh object literal on
 * every render, which would otherwise give the merged result a new identity
 * each time and defeat memoization (e.g. useMemo/useComputed) in consumers.
 *
 * @param value the object to stabilize.
 * @returns `value`, or the previous call's return value if shallowly equal.
 */
function useStableValue<T extends object>(value: T): T {
  const ref = useRef(value);

  const isEqual =
    shallowEqual(Object.keys(ref.current), Object.keys(value)) &&
    shallowEqual(Object.values(ref.current), Object.values(value));

  if (!isEqual) {
    ref.current = value;
  }

  return ref.current;
}

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

  // Stabilize the reference so callers that memoize on the returned context
  // (e.g. DropdownMenu's `useComputed`) don't invalidate on every render
  // just because `overrides` is a new object literal each time. The getters of
  // the context are not evaluated here, so that consumers do not observe them
  // unless they are used.
  const stableOverrides = useStableValue(overrides ?? EMPTY_OVERRIDES);

  return useMemo(
    () =>
      Object.keys(stableOverrides).length > 0
        ? mergeLazy(contextValue, stableOverrides)
        : contextValue,
    [contextValue, stableOverrides]
  );
}
