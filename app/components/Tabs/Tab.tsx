import { m } from "framer-motion";
import type { LocationDescriptor } from "history";
import { isEqual } from "es-toolkit/compat";
import queryString from "query-string";
import * as React from "react";
import styled, { css, useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s, hover } from "@shared/styles";
import NavLink from "~/components/NavLink";

interface BaseProps {
  /**
   * If true, the tab will only be active if the path matches exactly.
   */
  exact?: boolean;
  /**
   * If true, the tab will only be active if the query string matches exactly.
   * By default query string parameters are ignored for location matching.
   */
  exactQueryString?: boolean;
  children?: React.ReactNode;
}

interface LinkProps extends BaseProps {
  /**
   * The path to match against the current location.
   */
  to: LocationDescriptor;
  /**
   * Optional click handler called when the tab is clicked (in addition to navigation).
   */
  onClick?: () => void;
  active?: never;
}

interface ButtonProps
  extends BaseProps, React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Click handler for button mode, optional when the parent handles selection.
   */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /**
   * Whether the tab is currently active (only used in button mode).
   */
  active: boolean;
  to?: never;
}

type Props = LinkProps | ButtonProps;

const tabStyles = css`
  position: relative;
  display: inline-flex;
  align-items: center;
  font-weight: 500;
  font-size: 14px;
  cursor: var(--pointer);
  user-select: none;
  padding: 12px 0;

  ${breakpoint("tablet")`
    padding: 6px 0;
  `};
`;

const TabLink = styled(NavLink)`
  ${tabStyles}
  color: ${s("textTertiary")};

  &: ${hover} {
    color: ${s("textSecondary")};
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  ${tabStyles}
  color: ${({ $active }) => ($active ? s("textSecondary") : s("textTertiary"))};
  background: none;
  border: none;

  &: ${hover} {
    color: ${s("textSecondary")};
  }
`;

const Active = styled(m.div)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  width: 100%;
  border-radius: 3px;
  background: ${s("textSecondary")};
`;

const transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

/** Restrict shared layout animation to the X axis only. */
const horizontalOnly = (transform: Record<string, string>, generated: string) =>
  generated.replace(
    /translate3d\(([^,]+),\s*[^,]+,\s*([^)]+)\)/,
    "translate3d($1, 0px, $2)"
  );

/**
 * A single tab with an animated active underline, rendered either as a link
 * matched against the current location, or as a button in controlled mode.
 * A forwarded ref is only attached in button mode.
 */
export const Tab = React.forwardRef<HTMLButtonElement, Props>(function Tab(
  props: Props,
  ref
) {
  const { children, exact, exactQueryString } = props;
  const theme = useTheme();
  const activeStyle = {
    color: theme.textSecondary,
  };

  // Button mode - controlled by onClick and active props (no `to` prop)
  if ("active" in props && !("to" in props)) {
    const {
      active,
      exact: _exact,
      exactQueryString: _exactQueryString,
      ...rest
    } = props;

    return (
      <TabButton {...rest} ref={ref} type="button" $active={active}>
        {children}
        {active && (
          <Active
            layoutId="underline"
            initial={false}
            transition={transition}
            transformTemplate={horizontalOnly}
          />
        )}
      </TabButton>
    );
  }

  // Link mode - controlled by react-router
  const { to, ...rest } = props as LinkProps;
  return (
    <TabLink
      {...rest}
      to={to}
      exact={exact || exactQueryString}
      activeStyle={activeStyle}
    >
      {(match, location) => (
        <>
          {children}
          {match &&
            (!exactQueryString ||
              isEqual(
                queryString.parse(location.search ?? ""),
                queryString.parse(to.search as string)
              )) && (
              <Active
                layoutId="underline"
                initial={false}
                transition={transition}
                transformTemplate={horizontalOnly}
              />
            )}
        </>
      )}
    </TabLink>
  );
});
