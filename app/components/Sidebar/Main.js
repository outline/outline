// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { observer, inject } from 'mobx-react';
import { HomeIcon, EditIcon, SearchIcon, StarredIcon } from 'outline-icons';

import Flex from 'shared/components/Flex';
import AccountMenu from 'menus/AccountMenu';
import Sidebar, { Section } from './Sidebar';
import Scrollable from 'components/Scrollable';
import Collections from './components/Collections';
import SidebarLink from './components/SidebarLink';
import HeaderBlock from './components/HeaderBlock';
import Bubble from './components/Bubble';

import AuthStore from 'stores/AuthStore';
import DocumentsStore from 'stores/DocumentsStore';
import UiStore from 'stores/UiStore';

type Props = {
  history: Object,
  location: Location,
  auth: AuthStore,
  documents: DocumentsStore,
  ui: UiStore,
};

@observer
class MainSidebar extends React.Component<Props> {
  componentDidMount() {
    this.props.documents.fetchDrafts();
  }

  handleCreateCollection = () => {
    this.props.ui.setActiveModal('collection-new');
  };

  render() {
    const { auth, documents } = this.props;
    const { user, team } = auth;
    if (!user || !team) return null;

    return (
      <Sidebar>
        <AccountMenu
          label={
            <HeaderBlock
              subheading={user.name}
              teamName={team.name}
              logoUrl={team.avatarUrl}
              showDisclosure
            />
          }
        />
        <Flex auto column>
          <Scrollable shadow>
            <Section>
              <SidebarLink to="/dashboard" icon={<HomeIcon />} exact={false}>
                Home
              </SidebarLink>
              <SidebarLink to="/search" icon={<SearchIcon />}>
                Search
              </SidebarLink>
              <SidebarLink to="/starred" icon={<StarredIcon />} exact={false}>
                Starred
              </SidebarLink>
              <SidebarLink
                to="/drafts"
                icon={<EditIcon />}
                active={
                  documents.active ? !documents.active.publishedAt : undefined
                }
              >
                Drafts <Bubble count={documents.drafts.length} />
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

export default withRouter(inject('documents', 'auth', 'ui')(MainSidebar));
