// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import { Link } from 'react-router';
import styled from 'styled-components';
import { Flex } from 'reflexbox';
import { color } from 'styles/constants';

import UiStore from 'stores/UiStore';

type Props = {
  ui: UiStore,
};

@observer class LayoutSidebar extends React.Component {
  props: Props;

  componentDidMount() {
    setInterval(() => {
      this.props.ui.changeSidebarPanel(
        this.props.ui.sidebarPanel === 'main' ? 'secondary' : 'main'
      );
    }, 5000);
  }

  render() {
    const { ui } = this.props;

    return (
      <Container column visible={ui.sidebarVisible}>
        <Panel primary visible={ui.sidebarPanel === 'main'}>
          <Section>
            <NavLink>Search</NavLink>
          </Section>
          <Section>
            <NavLink>Dashboard</NavLink>
            <NavLink>Favorites</NavLink>
          </Section>
          <Section>
            <NavLink active>Engineering</NavLink>
          </Section>
        </Panel>
        <Panel secondary visible={ui.sidebarPanel === 'secondary'}>
          <Section>
            <NavLink active><StyledBackIcon /> Engineering </NavLink>
          </Section>
        </Panel>
      </Container>
    );
  }
}

const Container = styled(Flex)`
  position: relative;
  width: 200px;
  margin-left: ${({ visible }) => (visible ? '0' : '-200px')};
  padding: 40px 0;
  opacity: ${({ visible }) => (visible ? '1' : '0')};

  transition-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
  transform: translateZ(0);
  transition: all 0.25s
`;

const Section = styled(Flex)`
  padding: 0 25px;
  margin-bottom: 15px;
  flex-direction: column;
`;

const NavLink = styled(Link)`
  margin-bottom: 10px;

  color: ${({ active }) => (active ? color.text : 'rgba(12,12,12,0.6)')};
`;

// Panels

type PanelProps = {
  primary?: boolean,
  secondary?: boolean,
  visible: ?boolean,
  children: React.Element<any>,
};

const Panel = observer(({ children, ...props }: PanelProps) => {
  return (
    <PanelContainer {...props}>
      {children}
    </PanelContainer>
  );
});

const PanelContainer = styled(Flex)`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  flex-direction: column;

  opacity: ${props => (props.visible ? '1' : '0')};
  z-index: ${props => (props.visible ? '1' : '0')};

  ${props => props.primary && props.visible && `
    margin-left: 0px;
  `}
  ${props => props.primary && !props.visible && `
    margin-left: -50px;
  `}

  ${props => props.secondary && props.visible && `
    margin-left: 0px;
  `}
  ${props => props.secondary && !props.visible && `
    margin-left: 50px;
  `}

  transform: translateZ(0);
  transition: all 0.25s
  transition-timing-function: cubic-bezier(0.65, 0.05, 0.36, 1);
`;

const BackIcon = props => (
  <svg
    width="9px"
    height="15px"
    viewBox="0 0 9 15"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g
      id="Page-1"
      stroke="none"
      stroke-width="1"
      fill="none"
      fill-rule="evenodd"
    >
      <g id="Back-arrow" fill="#0C0C0C">
        <rect
          id="Rectangle-3"
          transform="translate(4.242641, 4.242641) scale(-1, 1) rotate(45.000000) translate(-4.242641, -4.242641) "
          x="-0.757359313"
          y="3.24264069"
          width="10"
          height="2"
          rx="1"
        />
        <rect
          id="Rectangle-3-Copy-3"
          transform="translate(4.242641, 10.242641) scale(-1, -1) rotate(45.000000) translate(-4.242641, -10.242641) "
          x="-0.757359313"
          y="9.24264069"
          width="10"
          height="2"
          rx="1"
        />
      </g>
    </g>
  </svg>
);

const StyledBackIcon = styled(BackIcon)`
  height: 10px;
  margin-left: -13px;

  * {
    fill: ${color.text};
  }
`;

export default inject('ui')(LayoutSidebar);
