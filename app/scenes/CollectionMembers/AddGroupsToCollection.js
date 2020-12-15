// @flow
import { debounce } from "lodash";
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { withTranslation, type TFunction } from "react-i18next";
import styled from "styled-components";
import AuthStore from "stores/AuthStore";
import CollectionGroupMembershipsStore from "stores/CollectionGroupMembershipsStore";
import GroupsStore from "stores/GroupsStore";
import UiStore from "stores/UiStore";
import Collection from "models/Collection";
import Group from "models/Group";
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
  t: TFunction,
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

  handleAddGroup = (group: Group) => {
    const { t } = this.props;

    try {
      this.props.collectionGroupMemberships.create({
        collectionId: this.props.collection.id,
        groupId: group.id,
        permission: "read_write",
      });
      this.props.ui.showToast(
        t("{{ groupName }} was added to the collection", {
          groupName: group.name,
        })
      );
    } catch (err) {
      this.props.ui.showToast(t("Could not add user"));
      console.error(err);
    }
  };

  render() {
    const { groups, collection, auth, t } = this.props;
    const { user, team } = auth;
    if (!user || !team) return null;

    return (
      <Flex column>
        <HelpText>
          {t("Can’t find the group you’re looking for?")}{" "}
          <a role="button" onClick={this.handleNewGroupModalOpen}>
            {t("Create a group")}
          </a>
          .
        </HelpText>

        <Input
          type="search"
          placeholder={`${t("Search by group name")}…`}
          value={this.query}
          onChange={this.handleFilter}
          label={t("Search groups")}
          labelHidden
          flex
        />
        <PaginatedList
          empty={
            this.query ? (
              <Empty>{t("No groups matching your search")}</Empty>
            ) : (
              <Empty>{t("No groups left to add")}</Empty>
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
                    {t("Add")}
                  </Button>
                </ButtonWrap>
              )}
            />
          )}
        />
        <Modal
          title={t("Create a group")}
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

export default withTranslation()<AddGroupsToCollection>(
  inject(
    "auth",
    "groups",
    "collectionGroupMemberships",
    "ui"
  )(AddGroupsToCollection)
);
