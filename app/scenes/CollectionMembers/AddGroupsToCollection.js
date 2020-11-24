// @flow
import { debounce } from "lodash";
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import AuthStore from "stores/AuthStore";
import CollectionGroupMembershipsStore from "stores/CollectionGroupMembershipsStore";
import GroupsStore from "stores/GroupsStore";
import UiStore from "stores/UiStore";
import Collection from "models/Collection";
import GroupNew from "scenes/GroupNew";
import Button from "components/Button";
import Empty from "components/Empty";
import Flex from "components/Flex";
import GroupListItem from "components/GroupListItem";
import HelpText from "components/HelpText";
import Input from "components/Input";
import Modal from "components/Modal";
import PaginatedList from "components/PaginatedList";

type Props = {
  ui: UiStore,
  auth: AuthStore,
  collection: Collection,
  collectionGroupMemberships: CollectionGroupMembershipsStore,
  groups: GroupsStore,
  onSubmit: () => void,
};

@observer
class AddGroupsToCollection extends React.Component<Props> {
  @observable newGroupModalOpen: boolean = false;
  @observable query: string = "";

  handleNewGroupModalOpen = () => {
    this.newGroupModalOpen = true;
  };

  handleNewGroupModalClose = () => {
    this.newGroupModalOpen = false;
  };

  handleFilter = (ev: SyntheticInputEvent<HTMLInputElement>) => {
    this.query = ev.target.value;
    this.debouncedFetch();
  };

  debouncedFetch = debounce(() => {
    this.props.groups.fetchPage({
      query: this.query,
    });
  }, 250);

  handleAddGroup = (group) => {
    try {
      this.props.collectionGroupMemberships.create({
        collectionId: this.props.collection.id,
        groupId: group.id,
        permission: "read_write",
      });
      this.props.ui.showToast(`${group.name} was added to the collection`);
    } catch (err) {
      this.props.ui.showToast("Could not add user");
      console.error(err);
    }
  };

  render() {
    const { groups, collection, auth } = this.props;
    const { user, team } = auth;
    if (!user || !team) return null;

    return (
      <Flex column>
        <HelpText>
          Can’t find the group you’re looking for?{" "}
          <a role="button" onClick={this.handleNewGroupModalOpen}>
            Create a group
          </a>
          .
        </HelpText>

        <Input
          type="search"
          placeholder="Search by group name…"
          value={this.query}
          onChange={this.handleFilter}
          label="Search groups"
          labelHidden
          flex
        />
        <PaginatedList
          empty={
            this.query ? (
              <Empty>No groups matching your search</Empty>
            ) : (
              <Empty>No groups left to add</Empty>
            )
          }
          items={groups.notInCollection(collection.id, this.query)}
          fetch={this.query ? undefined : groups.fetchPage}
          renderItem={(item) => (
            <GroupListItem
              key={item.id}
              group={item}
              showFacepile
              renderActions={() => (
                <ButtonWrap>
                  <Button onClick={() => this.handleAddGroup(item)} neutral>
                    Add
                  </Button>
                </ButtonWrap>
              )}
            />
          )}
        />
        <Modal
          title="Create a group"
          onRequestClose={this.handleNewGroupModalClose}
          isOpen={this.newGroupModalOpen}
        >
          <GroupNew onSubmit={this.handleNewGroupModalClose} />
        </Modal>
      </Flex>
    );
  }
}

const ButtonWrap = styled.div`
  margin-left: 6px;
`;

export default inject(
  "auth",
  "groups",
  "collectionGroupMemberships",
  "ui"
)(AddGroupsToCollection);
