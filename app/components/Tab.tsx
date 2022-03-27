import { m } from "framer-motion";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import NavLinkWithChildrenFunc from "~/components/NavLink";

type Props = Omit<
  React.ComponentProps<typeof NavLinkWithChildrenFunc>,
  "children"
> & {
  to: string;
  exact?: boolean;
};

const TabLink = styled(NavLinkWithChildrenFunc)`
  position: relative;
  display: inline-flex;
  align-items: center;
  font-weight: 500;
  font-size: 14px;
  color: ${(props) => props.theme.textTertiary};
  margin-right: 24px;
  padding: 6px 0;

  &:hover {
    color: ${(props) => props.theme.textSecondary};
  }
`;

const Active = styled(m.div)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  width: 100%;
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
  background: ${(props) => props.theme.textSecondary};
`;

const transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

const Tab: React.FC<Props> = ({ children, ...rest }) => {
  const theme = useTheme();
  const activeStyle = {
    color: theme.textSecondary,
  };

  return (
    <TabLink {...rest} activeStyle={activeStyle}>
      {(match) => (
        <>
          {children}
          {match && (
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
