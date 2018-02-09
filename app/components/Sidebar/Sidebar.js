// @flow
import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import { observer, inject } from 'mobx-react';
import Flex from 'shared/components/Flex';
import { color, layout } from 'shared/styles/constants';

import AccountMenu from 'menus/AccountMenu';
import Scrollable from 'components/Scrollable';
import HomeIcon from 'components/Icon/HomeIcon';
import SearchIcon from 'components/Icon/SearchIcon';
import StarredIcon from 'components/Icon/StarredIcon';
import Collections from './components/Collections';
import SidebarLink from './components/SidebarLink';
import HeaderBlock from './components/HeaderBlock';

import AuthStore from 'stores/AuthStore';
import UiStore from 'stores/UiStore';

type Props = {
  history: Object,
  location: Location,
  auth: AuthStore,
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

  handleCreateCollection = () => {
    this.props.ui.setActiveModal('collection-new');
  };

  handleEditCollection = () => {
    this.props.ui.setActiveModal('collection-edit');
  };

  toggleSidebar = () => {
    this.props.ui.toggleMobileSidebar();
  };

  render() {
    const { auth, ui } = this.props;
    const { user, team } = auth;
    if (!user || !team) return;

    return (
      <Container
        editMode={ui.editMode}
        mobileSidebarVisible={ui.mobileSidebarVisible}
        column
      >
        <Toggle
          onClick={this.toggleSidebar}
          mobileSidebarVisible={ui.mobileSidebarVisible}
        />
        <AccountMenu
          label={
            <HeaderBlock
              subheading={user.name}
              teamName={team.name}
              logoUrl={team.avatarUrl}
            />
          }
        />

        <Flex auto column>
          <Scrollable>
            <Section>
              <SidebarLink to="/dashboard" icon={<HomeIcon />}>
                Home
              </SidebarLink>
              <SidebarLink to="/search" icon={<SearchIcon />}>
                Search
              </SidebarLink>
              <SidebarLink to="/starred" icon={<StarredIcon />}>
                Starred
              </SidebarLink>
            </Section>
            <Section>
              <Collections
                history={this.props.history}
                location={this.props.location}
                onCreateCollection={this.handleCreateCollection}
              />
            </Section>
          </Scrollable>
        </Flex>
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

const Section = styled(Flex)`
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
  padding: 12px;
  margin: 16px;
  background: red;

  ${breakpoint('tablet')`
    display: none;
  `};
`;

export default withRouter(inject('user', 'auth', 'ui')(Sidebar));
