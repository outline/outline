// @flow
import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { observer, inject } from 'mobx-react';
import Flex from 'shared/components/Flex';

import AccountMenu from 'menus/AccountMenu';
import Sidebar, { Section } from './Sidebar';
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
class MainSidebar extends Component {
  props: Props;

  handleCreateCollection = () => {
    this.props.ui.setActiveModal('collection-new');
  };

  handleEditCollection = () => {
    this.props.ui.setActiveModal('collection-edit');
  };

  render() {
    const { auth } = this.props;
    const { user, team } = auth;
    if (!user || !team) return;

    return (
      <Sidebar>
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
      </Sidebar>
    );
  }
}

export default withRouter(inject('user', 'auth', 'ui')(MainSidebar));
