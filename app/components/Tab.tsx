import { m } from "framer-motion";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import { s } from "@shared/styles";
import NavLink from "~/components/NavLink";
import { hover } from "~/styles";

type Props = Omit<React.ComponentProps<typeof NavLink>, "children"> & {
  to: string;
  exact?: boolean;
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
  padding: 6px 0;

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

const Tab: React.FC<Props> = ({ children, ...rest }: Props) => {
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
