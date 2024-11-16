import { MobXProviderContext } from "mobx-react";
import * as React from "react";

export default function useStores() {
  return React.useContext(MobXProviderContext);
}
