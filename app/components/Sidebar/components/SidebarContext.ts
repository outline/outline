import * as React from "react";

export type SidebarContextType =
  | "collections"
  | "shared"
  | `group-${string}`
  | `starred-${string}`
  | undefined;

const SidebarContext = React.createContext<SidebarContextType>(undefined);

export const useSidebarContext = () => React.useContext(SidebarContext);

export const groupSidebarContext = (groupId: string): SidebarContextType =>
  `group-${groupId}`;

export const starredSidebarContext = (modelId: string): SidebarContextType =>
  `starred-${modelId}`;

export default SidebarContext;
