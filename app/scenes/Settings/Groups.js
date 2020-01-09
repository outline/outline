// @flow
import * as React from 'react';
import invariant from 'invariant';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { PlusIcon } from 'outline-icons';

import Empty from 'components/Empty';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import Modal from 'components/Modal';
import Button from 'components/Button';
import Invite from 'scenes/Invite';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';
import GroupListItem from './components/GroupListItem';
import List from 'components/List';
import Tabs from 'components/Tabs';
import Tab from 'components/Tab';

import AuthStore from 'stores/AuthStore';
import GroupsStore from 'stores/GroupsStore';
import PoliciesStore from 'stores/PoliciesStore';

type Props = {
  auth: AuthStore,
  groups: GroupsStore,
  policies: PoliciesStore,
  match: Object,
};

@observer
class Groups extends React.Component<Props> {
  // @observable inviteModalOpen: boolean = false;

  componentDidMount() {
    this.props.groups.fetchPage({ limit: 100 });
  }

  // handleInviteModalOpen = () => {
  //   this.inviteModalOpen = true;
  // };

  // handleInviteModalClose = () => {
  //   this.inviteModalOpen = false;
  // };

  render() {
    const { auth, policies, groups } = this.props;

    const showLoading = groups.isFetching && !groups.orderedData.length;
    const showEmpty = groups.isLoaded && !groups.orderedData.length;
    // TODO: add policies const can = policies.abilities(team.id);

    return (
      <CenteredContent>
        <PageTitle title="People" />
        <h1>Groups</h1>
        <HelpText>Groups are fun for everyone.</HelpText>
        {/* TODO: new group workflow */}
        <Button
          type="button"
          data-on="click"
          data-event-category="invite"
          data-event-action="peoplePage"
          // onClick={this.handleInviteModalOpen}
          icon={<PlusIcon />}
          neutral
        >
          New Group…
        </Button>

        <Tabs>
          <Tab to="/settings/groups" exact>
            All Groups
          </Tab>
        </Tabs>

        <List>
          {groups.orderedData.map(group => (
            // 1 TODO: list group items
            <GroupListItem key={group.id} group={group} />
            // 3 TODO: manage group workflow
          ))}
        </List>

        {showEmpty && <Empty>No groups to see here.</Empty>}
        {showLoading && <ListPlaceholder count={5} />}
      </CenteredContent>
    );
  }
}

export default inject('auth', 'groups', 'policies')(Groups);
