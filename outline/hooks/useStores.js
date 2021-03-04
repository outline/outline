// @flow
import { MobXProviderContext } from "mobx-react";
import * as React from "react";
import RootStore from "stores";

export default function useStores(): typeof RootStore {
  return React.useContext(MobXProviderContext);
}
