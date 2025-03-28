import { MobXProviderContext } from "mobx-react";
import * as React from "react";
import RootStore from "~/stores";

/**
 * Hook to access the MobX stores from the React context.
 *
 * @returns The root store containing all application stores
 */
export default function useStores() {
  return React.useContext(MobXProviderContext) as typeof RootStore;
}
