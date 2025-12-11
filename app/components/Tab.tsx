import { m } from "framer-motion";
import { LocationDescriptor } from "history";
import isEqual from "lodash/isEqual";
import queryString from "query-string";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import { s, hover, extraArea } from "@shared/styles";
import NavLink from "~/components/NavLink";

type Props = Omit<React.ComponentProps<typeof NavLink>, "children"> & {
  /**
   * The path to match against the current location.
   */
  to: LocationDescriptor;
  /**
   * If true, the tab will only be active if the path matches exactly.
   */
  exact?: boolean;
  /**
   * If true, the tab will only be active if the query string matches exactly.
   * By default query string parameters are ignored for location mathing.
   */
  exactQueryString?: boolean;
  children?: React.ReactNode;
};

const TabLink = styled(NavLink)`
  position: relative;
  display: inline-flex;
  align-items: center;
  font-weight: 500;
  font-size: 14px;
  cursor: var(--pointer);
  color: ${s("textTertiary")};
  user-select: none;
  margin-right: 24px;
  padding: 2px 0;
  ${extraArea(4)}

  &: ${hover} {
    color: ${s("text")};
  }
`;

const Active = styled(m.div)`
  position: absolute;
  top: 0;
  bottom: 0;
  left: -8px;
  right: -8px;
  border-radius: 12px;
  corner-shape: superellipse(1);
  background: ${s("sidebarActiveBackground")};
`;

const Content = styled.span`
  position: relative;
`;

const transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

const Tab: React.FC<Props> = ({
  children,
  exact,
  exactQueryString,
  ...rest
}: Props) => {
  const theme = useTheme();
  const activeStyle = {
    color: theme.text,
  };

  return (
    <TabLink
      {...rest}
      exact={exact || exactQueryString}
      activeStyle={activeStyle}
    >
      {(match, location) => (
        <>
          {match &&
            (!exactQueryString ||
              isEqual(
                queryString.parse(location.search ?? ""),
                queryString.parse(rest.to.search as string)
              )) && (
              <Active
                layoutId="underline"
                initial={false}
                transition={transition}
              />
            )}
          <Content>{children}</Content>
        </>
      )}
    </TabLink>
  );
};

export default Tab;
