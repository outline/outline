// @flow
import { observer } from "mobx-react";
import { CollapsedIcon } from "outline-icons";
import * as React from "react";
import { withRouter, NavLink } from "react-router-dom";
import styled, { withTheme } from "styled-components";
import Flex from "components/Flex";

type Props = {
  to?: string | Object,
  href?: string | Object,
  onClick?: (SyntheticEvent<>) => void,
  children?: React.Node,
  icon?: React.Node,
  expanded?: boolean,
  label?: React.Node,
  menu?: React.Node,
  menuOpen?: boolean,
  hideDisclosure?: boolean,
  iconColor?: string,
  active?: boolean,
  theme: Object,
  exact?: boolean,
  depth?: number,
};

function SidebarLink({
  icon,
  children,
  onClick,
  to,
  label,
  active,
  menu,
  menuOpen,
  hideDisclosure,
  theme,
  exact,
  href,
  depth,
  ...rest
}: Props) {
  const [expanded, setExpanded] = React.useState(rest.expanded);

  const style = React.useMemo(() => {
    return {
      paddingLeft: `${(depth || 0) * 16 + 16}px`,
    };
  }, [depth]);

  React.useEffect(() => {
    if (rest.expanded !== undefined) {
      setExpanded(rest.expanded);
    }
  }, [rest.expanded]);

  const handleClick = React.useCallback(
    (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      ev.stopPropagation();
      setExpanded(!expanded);
    },
    [expanded]
  );

  const handleExpand = React.useCallback(() => {
    setExpanded(true);
  }, []);

  const showDisclosure = !!children && !hideDisclosure;
  const activeStyle = {
    color: theme.text,
    background: theme.sidebarItemBackground,
    fontWeight: 600,
    ...style,
  };

  return (
    <Wrapper column>
      <StyledNavLink
        activeStyle={activeStyle}
        style={active ? activeStyle : style}
        onClick={onClick}
        exact={exact !== false}
        to={to}
        as={to ? undefined : href ? "a" : "div"}
        href={href}
      >
        {icon && <IconWrapper>{icon}</IconWrapper>}
        <Label onClick={handleExpand}>
          {showDisclosure && (
            <Disclosure expanded={expanded} onClick={handleClick} />
          )}
          {label}
        </Label>
        {menu && <Action menuOpen={menuOpen}>{menu}</Action>}
      </StyledNavLink>
      <ChildrenWrapper expanded={expanded}>{children}</ChildrenWrapper>
    </Wrapper>
  );
}

// accounts for whitespace around icon
const IconWrapper = styled.span`
  margin-left: -4px;
  margin-right: 4px;
  height: 24px;
`;

const Action = styled.span`
  display: ${(props) => (props.menuOpen ? "inline" : "none")};
  position: absolute;
  top: 4px;
  right: 4px;
  color: ${(props) => props.theme.textTertiary};

  svg {
    opacity: 0.75;
  }

  &:hover {
    svg {
      opacity: 1;
    }
  }
`;

const StyledNavLink = styled(NavLink)`
  display: flex;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 4px 16px;
  border-radius: 4px;
  color: ${(props) => props.theme.sidebarText};
  font-size: 15px;
  cursor: pointer;

  &:hover {
    color: ${(props) => props.theme.text};
  }

  &:focus {
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.black05};
  }

  &:hover {
    > ${Action} {
      display: inline;
    }
  }
`;

const Wrapper = styled(Flex)`
  position: relative;
`;

const Label = styled.div`
  position: relative;
  width: 100%;
  max-height: 4.8em;
  line-height: 1.6;
`;

const Disclosure = styled(CollapsedIcon)`
  position: absolute;
  left: -24px;

  ${({ expanded }) => !expanded && "transform: rotate(-90deg);"};
`;

const ChildrenWrapper = styled.div(({ expanded }) => ({
  display: expanded ? "block" : "none",
}));

export default withRouter(withTheme(observer(SidebarLink)));
