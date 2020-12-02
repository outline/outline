// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { withTranslation, type TFunction } from "react-i18next";
import AuthStore from "stores/AuthStore";
import GroupMembershipsStore from "stores/GroupMembershipsStore";
import PoliciesStore from "stores/PoliciesStore";
import UiStore from "stores/UiStore";
import UsersStore from "stores/UsersStore";
import Group from "models/Group";
import User from "models/User";
import Button from "components/Button";
import Empty from "components/Empty";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Modal from "components/Modal";
import PaginatedList from "components/PaginatedList";
import Subheading from "components/Subheading";
import AddPeopleToGroup from "./AddPeopleToGroup";
import GroupMemberListItem from "./components/GroupMemberListItem";

type Props = {
  ui: UiStore,
  auth: AuthStore,
  group: Group,
  users: UsersStore,
  policies: PoliciesStore,
  groupMemberships: GroupMembershipsStore,
  t: TFunction,
};

@observer
class GroupMembers extends React.Component<Props> {
  @observable addModalOpen: boolean = false;

  handleAddModalOpen = () => {
    this.addModalOpen = true;
  };

  handleAddModalClose = () => {
    this.addModalOpen = false;
  };

  handleRemoveUser = async (user: User) => {
    const { t } = this.props;

    try {
      await this.props.groupMemberships.delete({
        groupId: this.props.group.id,
        userId: user.id,
      });
      this.props.ui.showToast(
        t(`{{userName}} was removed from the group`, { userName: user.name })
      );
    } catch (err) {
      this.props.ui.showToast(t("Could not remove user"));
    }
  };

  render() {
    const { group, users, groupMemberships, policies, t, auth } = this.props;
    const { user } = auth;
    if (!user) return null;

    const can = policies.abilities(group.id);

    return (
      <Flex column>
        {can.update ? (
          <>
            <HelpText>
              Add and remove team members in the <strong>{group.name}</strong>{" "}
              group. Adding people to the group will give them access to any
              collections this group has been given access to.
            </HelpText>
            <span>
              <Button
                type="button"
                onClick={this.handleAddModalOpen}
                icon={<PlusIcon />}
                neutral
              >
                {t("Add people…")}
              </Button>
            </span>
          </>
        ) : (
          <HelpText>
            Listing team members in the <strong>{group.name}</strong> group.
          </HelpText>
        )}

        <Subheading>Members</Subheading>
        <PaginatedList
          items={users.inGroup(group.id)}
          fetch={groupMemberships.fetchPage}
          options={{ id: group.id }}
          empty={<Empty>{t("This group has no members.")}</Empty>}
          renderItem={(item) => (
            <GroupMemberListItem
              key={item.id}
              user={item}
              membership={groupMemberships.get(`${item.id}-${group.id}`)}
              onRemove={
                can.update ? () => this.handleRemoveUser(item) : undefined
              }
            />
          )}
        />
        {can.update && (
          <Modal
            title={`Add people to ${group.name}`}
            onRequestClose={this.handleAddModalClose}
            isOpen={this.addModalOpen}
          >
            <AddPeopleToGroup
              group={group}
              onSubmit={this.handleAddModalClose}
            />
          </Modal>
        )}
      </Flex>
    );
  }
}

export default withTranslation()<GroupMembers>(
  inject("auth", "users", "policies", "groupMemberships", "ui")(GroupMembers)
);
