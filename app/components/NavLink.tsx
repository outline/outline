import * as React from "react";
import type { Location, To } from "react-router-dom";
import { NavLink, useLocation } from "react-router-dom";
import type { ToWithState } from "~/types";

type Props = Omit<
  React.ComponentProps<typeof NavLink>,
  "children" | "style" | "to"
> & {
  children?:
    | ((isActive: boolean, location: Location) => React.ReactNode)
    | React.ReactNode;
  /** If true, the tab will only be active if the path matches exactly */
  exact?: boolean;
  /** CSS properties to apply to the link when it is active */
  activeStyle?: React.CSSProperties;
  /** Static styles to apply to the link */
  style?: React.CSSProperties;
  /** The path to match against the current location */
  to: ToWithState;
};

/** Splits a location descriptor into a navigation target and its state. */
function splitTo(to: ToWithState): { to: To; state: unknown } {
  if (typeof to === "object" && to && "state" in to) {
    const { state, ...path } = to;
    return { to: path, state };
  }
  return { to, state: undefined };
}

function NavLinkWithChildrenFunc(
  { to, exact = false, children, activeStyle, style, ...rest }: Props,
  ref?: React.Ref<HTMLAnchorElement>
) {
  const location = useLocation();
  const target = splitTo(to);

  return (
    <NavLink
      {...rest}
      to={target.to}
      state={target.state}
      end={exact}
      ref={ref}
      style={({ isActive }) => ({
        ...style,
        ...(isActive ? activeStyle : undefined),
      })}
    >
      {typeof children === "function"
        ? ({ isActive }) => children(isActive, location)
        : children}
    </NavLink>
  );
}

export default React.forwardRef<HTMLAnchorElement, Props>(
  NavLinkWithChildrenFunc
);
