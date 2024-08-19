import * as React from "react";

const SharedContext = React.createContext<boolean>(false);

export const useSharedContext = () => React.useContext(SharedContext);

export default SharedContext;
