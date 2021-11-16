import { MobXProviderContext } from "mobx-react";
import * as React from "react";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'stores' or its corresponding t... Remove this comment to see the full error message
import RootStore from "stores";

export default function useStores(): typeof RootStore {
  return React.useContext(MobXProviderContext);
}
