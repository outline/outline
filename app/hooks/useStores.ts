import { MobXProviderContext } from "mobx-react";
import { useContext } from "react";
import type RootStore from "~/stores/RootStore";

/**
 * Hook to access the MobX stores from the React context.
 *
 * @returns The root store containing all application stores.
 */
export default function useStores(): RootStore {
  const { rootStore } = useContext(MobXProviderContext) as {
    rootStore: RootStore;
  };
  return rootStore;
}
