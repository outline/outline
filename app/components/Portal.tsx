import * as React from "react";
import { createPortal } from "react-dom";

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
 *
 * @param toBody Always render into document.body, ignoring context. Use when
 * children are positioned in document coordinates.
 */
export function Portal(props: { children: React.ReactNode; toBody?: boolean }) {
  const node = React.useContext(PortalContext);
  return createPortal(
    props.children,
    (props.toBody ? null : node) ?? document.body
  );
}
