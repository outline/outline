import { NavigationNode } from "../types";
import * as React from "react";

type ShareContextType = {
  shareId?: string;
  sharedTree?: NavigationNode;
};

export const ShareContext = React.createContext<ShareContextType>({});

export default function useShare(): ShareContextType & { isShare: boolean } {
  const value = React.useContext(ShareContext);

  return {
    ...value,
    isShare: !!value.shareId,
  };
}
