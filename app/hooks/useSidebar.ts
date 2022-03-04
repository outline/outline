import React from "react";

export const SidebarContext = React.createContext<React.Dispatch<
  React.SetStateAction<number>
> | null>(null);

const useSidebar = () => React.useContext(SidebarContext);

export default useSidebar;
