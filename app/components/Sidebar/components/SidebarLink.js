// @flow
import * as React from 'react';
import { observable, action } from 'mobx';
import { observer } from 'mobx-react';
import { withRouter, NavLink } from 'react-router-dom';
import { CollapsedIcon } from 'outline-icons';
import { color, fontWeight } from 'shared/styles/constants';
import styled from 'styled-components';
import Flex from 'shared/components/Flex';

const activeStyle = {
  color: color.black,
  fontWeight: fontWeight.medium,
};

const StyledGoTo = styled(CollapsedIcon)`
  margin-bottom: -4px;
  margin-left: 1px;
  margin-right: -3px;
  ${({ expanded }) => !expanded && 'transform: rotate(-90deg);'};
`;

const IconWrapper = styled.span`
  margin-left: -4px;
  margin-right: 4px;
  height: 24px;
`;

const StyledNavLink = styled(NavLink)`
  display: flex;
  width: 100%;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 4px 0;
  margin-left: ${({ icon }) => (icon ? '-20px;' : '0')};
  color: ${color.slateDark};
  font-size: 15px;
  cursor: pointer;

  &:hover {
    color: ${color.text};
  }
`;

const StyledDiv = StyledNavLink.withComponent('div');

type Props = {
  to?: string | Object,
  onClick?: (SyntheticEvent<*>) => *,
  children?: React.Node,
  icon?: React.Node,
  expand?: boolean,
  expandedContent?: React.Node,
  menu?: React.Node,
  menuOpen?: boolean,
  hideExpandToggle?: boolean,
  iconColor?: string,
  active?: boolean,
};

@observer
class SidebarLink extends React.Component<Props> {
  @observable expanded: boolean = false;

  componentDidMount() {
    if (this.props.expand) this.handleExpand();
  }

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.expand) this.handleExpand();
  }

  @action
  handleClick = (event: SyntheticEvent<*>) => {
    event.preventDefault();
    event.stopPropagation();
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
      expandedContent,
      expand,
      active,
      menu,
      menuOpen,
      hideExpandToggle,
    } = this.props;
    const Component = to ? StyledNavLink : StyledDiv;
    const showExpandIcon =
      expandedContent && !hideExpandToggle ? true : undefined;

    return (
      <Wrapper menuOpen={menuOpen} column>
        <Component
          icon={showExpandIcon}
          activeStyle={activeStyle}
          style={active ? activeStyle : undefined}
          onClick={onClick}
          to={to}
          exact
        >
          {icon && <IconWrapper>{icon}</IconWrapper>}
          {showExpandIcon && (
            <StyledGoTo expanded={this.expanded} onClick={this.handleClick} />
          )}
          <Content onClick={this.handleExpand}>{children}</Content>
        </Component>
        {/* Collection */ expand && hideExpandToggle && expandedContent}
        {/* Document */ this.expanded && !hideExpandToggle && expandedContent}
        {menu && <Action>{menu}</Action>}
      </Wrapper>
    );
  }
}

const Action = styled.span`
  position: absolute;
  right: 0;
  top: 2px;
  color: ${color.slate};
  svg {
    opacity: 0.75;
  }

  &:hover {
    svg {
      opacity: 1;
    }
  }
`;

const Wrapper = styled(Flex)`
  position: relative;

  > ${Action} {
    display: ${props => (props.menuOpen ? 'inline' : 'none')};
  }

  &:hover {
    > ${Action} {
      display: inline;
    }
  }
`;

const Content = styled.div`
  width: 100%;
`;

export default withRouter(SidebarLink);
