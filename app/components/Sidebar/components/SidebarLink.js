// @flow
import * as React from 'react';
import { observable, action } from 'mobx';
import { observer } from 'mobx-react';
import { withRouter, NavLink } from 'react-router-dom';
import { CollapsedIcon } from 'outline-icons';
import styled, { withTheme } from 'styled-components';
import Flex from 'shared/components/Flex';

type Props = {
  to?: string | Object,
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

@observer
class SidebarLink extends React.Component<Props> {
  @observable expanded: ?boolean = this.props.expanded;

  style = {
    paddingLeft: `${(this.props.depth || 0) * 16 + 16}px`,
  };

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.expanded !== undefined) {
      this.expanded = nextProps.expanded;
    }
  }

  @action
  handleClick = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    ev.stopPropagation();

    this.expanded = !this.expanded;
  };

  @action
  handleExpand = () => {
    this.expanded = true;
  };

  render() {
    const {
      icon,
      children,
      onClick,
      to,
      label,
      active,
      menu,
      menuOpen,
      hideDisclosure,
      exact,
    } = this.props;
    const showDisclosure = !!children && !hideDisclosure;
    const activeStyle = {
      color: this.props.theme.text,
      background: this.props.theme.sidebarItemBackground,
      fontWeight: 600,
      ...this.style,
    };

    return (
      <Wrapper column>
        <StyledNavLink
          activeStyle={activeStyle}
          style={active ? activeStyle : this.style}
          onClick={onClick}
          exact={exact !== false}
          to={to}
          as={to ? undefined : 'div'}
        >
          {icon && <IconWrapper>{icon}</IconWrapper>}
          <Label onClick={this.handleExpand}>
            {showDisclosure && (
              <Disclosure expanded={this.expanded} onClick={this.handleClick} />
            )}
            {label}
          </Label>
          {menu && <Action menuOpen={menuOpen}>{menu}</Action>}
        </StyledNavLink>
        {this.expanded && children}
      </Wrapper>
    );
  }
}

// accounts for whitespace around icon
const IconWrapper = styled.span`
  margin-left: -4px;
  margin-right: 4px;
  height: 24px;
`;

const Action = styled.span`
  display: ${props => (props.menuOpen ? 'inline' : 'none')};
  position: absolute;
  top: 4px;
  right: 4px;
  color: ${props => props.theme.textTertiary};

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
  color: ${props => props.theme.sidebarText};
  font-size: 15px;
  cursor: pointer;

  &:hover {
    color: ${props => props.theme.text};
  }

  &:focus {
    color: ${props => props.theme.text};
    background: ${props => props.theme.sidebarItemBackground};
    outline: none;
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

  ${({ expanded }) => !expanded && 'transform: rotate(-90deg);'};
`;

export default withRouter(withTheme(SidebarLink));
