import * as React from "react";

const StarredContext = React.createContext<boolean | undefined>(undefined);

export const useStarredContext = () => React.useContext(StarredContext);

export default StarredContext;
