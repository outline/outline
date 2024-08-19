import * as React from "react";

const StarredContext = React.createContext<boolean>(false);

export const useStarredContext = () => React.useContext(StarredContext);

export default StarredContext;
