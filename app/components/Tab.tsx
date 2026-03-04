import { m } from "framer-motion";
import type { LocationDescriptor } from "history";
import isEqual from "lodash/isEqual";
import queryString from "query-string";
import * as React from "react";
import styled, { useTheme } from "styled-components";
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

interface ButtonProps extends BaseProps {
  /**
   * Click handler for button mode.
   */
  onClick: () => void;
  /**
   * Whether the tab is currently active (only used in button mode).
   */
  active: boolean;
  to?: never;
}

type Props = LinkProps | ButtonProps;

const tabStyles = `
  position: relative;
  display: inline-flex;
  align-items: center;
  font-weight: 500;
  font-size: 14px;
  cursor: var(--pointer);
  user-select: none;
  margin-right: 24px;
  padding: 6px 0;
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

const Tab: React.FC<Props> = (props: Props) => {
  const { children, exact, exactQueryString } = props;
  const theme = useTheme();
  const activeStyle = {
    color: theme.textSecondary,
  };

  // Button mode - controlled by onClick and active props (no `to` prop)
  if ("active" in props && !("to" in props)) {
    return (
      <TabButton $active={props.active} onClick={props.onClick}>
        {children}
        {props.active && (
          <Active
            layoutId="underline"
            initial={false}
            transition={transition}
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
              />
            )}
        </>
      )}
    </TabLink>
  );
};

export default Tab;
