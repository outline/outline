import { debounce } from "lodash";
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { withTranslation, WithTranslation } from "react-i18next";
import styled from "styled-components";
import RootStore from "~/stores/RootStore";
import Collection from "~/models/Collection";
import Group from "~/models/Group";
import GroupNew from "~/scenes/GroupNew";
import Button from "~/components/Button";
import ButtonLink from "~/components/ButtonLink";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import GroupListItem from "~/components/GroupListItem";
import Input from "~/components/Input";
import Modal from "~/components/Modal";
import PaginatedList from "~/components/PaginatedList";
import Text from "~/components/Text";
import withStores from "~/components/withStores";

type Props = WithTranslation &
  RootStore & {
    collection: Collection;
    onSubmit: () => void;
  };

@observer
class AddGroupsToCollection extends React.Component<Props> {
  @observable
  newGroupModalOpen = false;

  @observable
  query = "";

  handleNewGroupModalOpen = () => {
    this.newGroupModalOpen = true;
  };

  handleNewGroupModalClose = () => {
    this.newGroupModalOpen = false;
  };

  handleFilter = (ev: React.ChangeEvent<HTMLInputElement>) => {
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
      this.props.toasts.showToast(
        t("{{ groupName }} was added to the collection", {
          groupName: group.name,
        }),
        {
          type: "success",
        }
      );
    } catch (err) {
      this.props.toasts.showToast(t("Could not add user"), {
        type: "error",
      });
      console.error(err);
    }
  };

  render() {
    const { groups, policies, collection, auth, t } = this.props;
    const { user, team } = auth;
    if (!user || !team) {
      return null;
    }

    const can = policies.abilities(team.id);

    return (
      <Flex column>
        {can.createGroup && (
          <Text type="secondary">
            {t("Can’t find the group you’re looking for?")}{" "}
            <ButtonLink onClick={this.handleNewGroupModalOpen}>
              {t("Create a group")}
            </ButtonLink>
            .
          </Text>
        )}

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
          renderItem={(item: Group) => (
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
        {can.createGroup && (
          <Modal
            title={t("Create a group")}
            onRequestClose={this.handleNewGroupModalClose}
            isOpen={this.newGroupModalOpen}
          >
            <GroupNew onSubmit={this.handleNewGroupModalClose} />
          </Modal>
        )}
      </Flex>
    );
  }
}

const ButtonWrap = styled.div`
  margin-left: 6px;
`;

export default withTranslation()(withStores(AddGroupsToCollection));
