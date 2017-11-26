// @flow
import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import Flex from 'shared/components/Flex';
import { color, layout } from 'shared/styles/constants';

import AccountMenu from 'menus/AccountMenu';
import Avatar from 'components/Avatar';
import Scrollable from 'components/Scrollable';
import HomeIcon from 'components/Icon/HomeIcon';
import Header from './components/Header';
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
            <HeaderBlock user={user} team={team}>
              <Avatar src={user.avatarUrl} />
            </HeaderBlock>
          }
        />

        <Flex auto column>
          <Scrollable innerRef={this.setScrollableRef}>
            <Section>
              <Header>Account</Header>
              <SidebarLink to="/settings" icon={<HomeIcon />}>
                Profile
              </SidebarLink>
              <SidebarLink to="/settings/notifications" icon={<HomeIcon />}>
                Notifications
              </SidebarLink>
              <SidebarLink to="/settings/tokens" icon={<HomeIcon />}>
                API Access
              </SidebarLink>
            </Section>
            <Section>
              <Header>Team</Header>
              <SidebarLink to="/settings/details" icon={<HomeIcon />}>
                Details
              </SidebarLink>
              <SidebarLink to="/settings/people" icon={<HomeIcon />}>
                People
              </SidebarLink>
              <SidebarLink
                to="/settings/integrations/slack"
                icon={<HomeIcon />}
              >
                Slack
              </SidebarLink>
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
