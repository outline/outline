import * as React from "react";
import { Portal as ReactPortal } from "react-portal";

/**
 * A React context that provides a dom node for portals to be rendered into.
 */
export const PortalContext = React.createContext<
  HTMLElement | null | undefined
>(undefined);

/**
 * A hook that returns the portal context value.
 */
export const usePortalContext = () => React.useContext(PortalContext);

/**
 * A portal component that uses context to render into a different dom node
 * or the root of body if no context is available.
 */
export function Portal(props: { children: React.ReactNode }) {
  const node = React.useContext(PortalContext);
  return <ReactPortal node={node}>{props.children}</ReactPortal>;
}
