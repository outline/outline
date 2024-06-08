import * as React from "react";

const SharedContext = React.createContext<boolean | undefined>(undefined);

export const useSharedContext = () => React.useContext(SharedContext);

export default SharedContext;
