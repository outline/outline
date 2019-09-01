// @flow
import * as React from 'react';
import { observable, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import Waypoint from 'react-waypoint';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';

import { DEFAULT_PAGINATION_LIMIT } from 'stores/BaseStore';
import User from 'models/User';
import Collection from 'models/Collection';
import UsersStore from 'stores/UsersStore';
import UiStore from 'stores/UiStore';
import MembershipsStore from 'stores/MembershipsStore';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import MemberListItem from './MemberListItem';

type Props = {
  ui: UiStore,
  users: UsersStore,
  memberships: MembershipsStore,
  currentUser: User,
  collection: Collection,
  empty?: React.Node,
};

@observer
class PaginatedMembersList extends React.Component<Props> {
  isInitiallyLoaded: boolean = false;
  @observable isLoaded: boolean = false;
  @observable isFetchingMore: boolean = false;
  @observable isFetching: boolean = false;
  @observable offset: number = 0;
  @observable allowLoadMore: boolean = true;

  componentDidMount() {
    const { users, collection } = this.props;
    this.isInitiallyLoaded = !!users.inCollection(collection.id).length;
    this.fetchResults();
  }

  fetchResults = async () => {
    this.isFetching = true;

    const limit = DEFAULT_PAGINATION_LIMIT;
    const results = await this.props.memberships.fetchPage({
      limit,
      offset: this.offset,
      id: this.props.collection.id,
    });

    if (
      results &&
      (results.length === 0 || results.length < DEFAULT_PAGINATION_LIMIT)
    ) {
      this.allowLoadMore = false;
    } else {
      this.offset += DEFAULT_PAGINATION_LIMIT;
    }

    this.isLoaded = true;
    this.isFetching = false;
    this.isFetchingMore = false;
  };

  @action
  loadMoreResults = async () => {
    // Don't paginate if there aren't more results or we’re in the middle of fetching
    if (!this.allowLoadMore || this.isFetching) return;

    this.isFetchingMore = true;
    await this.fetchResults();
  };

  handleAddUser = user => {
    try {
      this.props.collection.addUser(user);
      this.props.ui.showToast(`${user.name} was added to the collection`);
    } catch (err) {
      this.props.ui.showToast('Could not add user');
    }
  };

  handleRemoveUser = user => {
    try {
      this.props.collection.removeUser(user);
    } catch (err) {
      this.props.ui.showToast(`${user.name} was removed from the collection`);
      this.props.ui.showToast('Could not remove user');
    }
  };

  render() {
    const { empty, users, currentUser, collection } = this.props;

    const usersInCollection = collection.private
      ? users.inCollection(collection.id)
      : users.active;

    const showLoading =
      this.isFetching && !this.isFetchingMore && !this.isInitiallyLoaded;
    const showEmpty = !usersInCollection.length || showLoading;
    const showList = (this.isLoaded || this.isInitiallyLoaded) && !showLoading;

    return (
      <React.Fragment>
        {showEmpty && empty}
        {showList && (
          <React.Fragment>
            <ArrowKeyNavigation
              mode={ArrowKeyNavigation.mode.VERTICAL}
              defaultActiveChildIndex={0}
            >
              {usersInCollection.map(user => (
                <MemberListItem
                  key={user.id}
                  user={user}
                  canEdit={collection.private && user.id !== currentUser.id}
                  onRemove={() => this.handleRemoveUser(user)}
                />
              ))}
            </ArrowKeyNavigation>
            {this.allowLoadMore && (
              <Waypoint key={this.offset} onEnter={this.loadMoreResults} />
            )}
          </React.Fragment>
        )}
        {showLoading && <ListPlaceholder count={5} />}
      </React.Fragment>
    );
  }
}

export default inject('memberships', 'users', 'ui')(PaginatedMembersList);
