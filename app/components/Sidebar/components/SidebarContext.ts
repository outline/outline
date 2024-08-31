import * as React from "react";

export type SidebarContextType = "collections" | "starred" | string | undefined;

const SidebarContext = React.createContext<SidebarContextType>(undefined);

export const useSidebarContext = () => React.useContext(SidebarContext);

export default SidebarContext;
