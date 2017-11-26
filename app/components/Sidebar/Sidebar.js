// @flow
import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import styled from 'styled-components';
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
  scrollable: ?HTMLDivElement;

  handleCreateCollection = () => {
    this.props.ui.setActiveModal('collection-new');
  };

  handleEditCollection = () => {
    this.props.ui.setActiveModal('collection-edit');
  };

  setScrollableRef = ref => {
    this.scrollable = ref;
  };

  scrollToActiveDocument = ref => {
    const scrollable = this.scrollable;
    if (!ref || !scrollable) return;

    const container = scrollable.getBoundingClientRect();
    const bounds = ref.getBoundingClientRect();
    const scrollTop = bounds.top + container.top;
    scrollable.scrollTop = scrollTop;
  };

  render() {
    const { auth, ui } = this.props;
    const { user, team } = auth;
    if (!user || !team) return;

    return (
      <Container column editMode={ui.editMode}>
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
          <Scrollable innerRef={this.setScrollableRef}>
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
                activeDocumentRef={this.scrollToActiveDocument}
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
  width: ${layout.sidebarWidth};
  background: ${color.smoke};
  transition: left 200ms ease-in-out;
`;

const Section = styled(Flex)`
  flex-direction: column;
  margin: 24px 0;
  padding: 0 24px;
  position: relative;
`;

export default withRouter(inject('user', 'auth', 'ui')(Sidebar));
