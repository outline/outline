// @flow
import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import { observer, inject } from 'mobx-react';
import Flex from 'shared/components/Flex';
import { color, layout } from 'shared/styles/constants';

import CloseIcon from 'components/Icon/CloseIcon';
import MenuIcon from 'components/Icon/MenuIcon';

import AuthStore from 'stores/AuthStore';
import DocumentsStore from 'stores/DocumentsStore';
import UiStore from 'stores/UiStore';

type Props = {
  children: React.Element<any>,
  history: Object,
  location: Location,
  auth: AuthStore,
  documents: DocumentsStore,
  ui: UiStore,
};

@observer
class Sidebar extends Component {
  props: Props;

  componentWillReceiveProps = (nextProps: Props) => {
    if (this.props.location !== nextProps.location) {
      this.props.ui.hideMobileSidebar();
    }
  };

  toggleSidebar = () => {
    this.props.ui.toggleMobileSidebar();
  };

  render() {
    const { children, ui } = this.props;

    return (
      <Container
        editMode={ui.editMode}
        mobileSidebarVisible={ui.mobileSidebarVisible}
        column
      >
        <Toggle
          onClick={this.toggleSidebar}
          mobileSidebarVisible={ui.mobileSidebarVisible}
        >
          {ui.mobileSidebarVisible ? <CloseIcon /> : <MenuIcon />}
        </Toggle>
        {children}
      </Container>
    );
  }
}

const Container = styled(Flex)`
  position: fixed;
  top: 0;
  bottom: 0;
  left: ${props => (props.editMode ? `-${layout.sidebarWidth}` : 0)};
  width: 100%;
  background: ${color.smoke};
  transition: left 200ms ease-in-out;
  margin-left: ${props => (props.mobileSidebarVisible ? 0 : '-100%')};
  z-index: 1;

  @media print {
    display: none;
    left: 0;
  }

  ${breakpoint('tablet')`
    width: ${layout.sidebarWidth};
    margin: 0;
  `};
`;

export const Section = styled(Flex)`
  flex-direction: column;
  margin: 24px 0;
  padding: 0 24px;
  position: relative;
`;

const Toggle = styled.a`
  position: fixed;
  top: 0;
  left: ${props => (props.mobileSidebarVisible ? 'auto' : 0)};
  right: ${props => (props.mobileSidebarVisible ? 0 : 'auto')};
  z-index: 1;
  margin: 16px;

  ${breakpoint('tablet')`
    display: none;
  `};
`;

export default withRouter(inject('ui')(Sidebar));
