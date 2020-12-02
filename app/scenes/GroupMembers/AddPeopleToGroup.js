// @flow
import { debounce } from "lodash";
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { withTranslation, type TFunction } from "react-i18next";
import AuthStore from "stores/AuthStore";
import GroupMembershipsStore from "stores/GroupMembershipsStore";
import UiStore from "stores/UiStore";
import UsersStore from "stores/UsersStore";
import Group from "models/Group";
import User from "models/User";
import Invite from "scenes/Invite";
import Empty from "components/Empty";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Input from "components/Input";
import Modal from "components/Modal";
import PaginatedList from "components/PaginatedList";
import GroupMemberListItem from "./components/GroupMemberListItem";

type Props = {
  ui: UiStore,
  auth: AuthStore,
  group: Group,
  groupMemberships: GroupMembershipsStore,
  users: UsersStore,
  onSubmit: () => void,
  t: TFunction,
};

@observer
class AddPeopleToGroup extends React.Component<Props> {
  @observable inviteModalOpen: boolean = false;
  @observable query: string = "";

  handleInviteModalOpen = () => {
    this.inviteModalOpen = true;
  };

  handleInviteModalClose = () => {
    this.inviteModalOpen = false;
  };

  handleFilter = (ev: SyntheticInputEvent<HTMLInputElement>) => {
    this.query = ev.target.value;
    this.debouncedFetch();
  };

  debouncedFetch = debounce(() => {
    this.props.users.fetchPage({
      query: this.query,
    });
  }, 250);

  handleAddUser = async (user: User) => {
    const { t } = this.props;

    try {
      await this.props.groupMemberships.create({
        groupId: this.props.group.id,
        userId: user.id,
      });
      this.props.ui.showToast(
        t(`{{userName}} was added to the group`, { userName: user.name })
      );
    } catch (err) {
      this.props.ui.showToast(t("Could not add user"));
    }
  };

  render() {
    const { users, group, auth, t } = this.props;
    const { user, team } = auth;
    if (!user || !team) return null;

    return (
      <Flex column>
        <HelpText>
          {t(
            "Add team members below to give them access to the group. Need to add someone who’s not yet on the team yet?"
          )}{" "}
          <a role="button" onClick={this.handleInviteModalOpen}>
            {t("Invite them to {{teamName}}", { teamName: team.name })}
          </a>
          .
        </HelpText>

        <Input
          type="search"
          placeholder={t("Search by name…")}
          value={this.query}
          onChange={this.handleFilter}
          label={t("Search people")}
          labelHidden
          autoFocus
          flex
        />
        <PaginatedList
          empty={
            this.query ? (
              <Empty>{t("No people matching your search")}</Empty>
            ) : (
              <Empty>{t("No people left to add")}</Empty>
            )
          }
          items={users.notInGroup(group.id, this.query)}
          fetch={this.query ? undefined : users.fetchPage}
          renderItem={(item) => (
            <GroupMemberListItem
              key={item.id}
              user={item}
              onAdd={() => this.handleAddUser(item)}
              canEdit
            />
          )}
        />
        <Modal
          title={t("Invite people")}
          onRequestClose={this.handleInviteModalClose}
          isOpen={this.inviteModalOpen}
        >
          <Invite onSubmit={this.handleInviteModalClose} />
        </Modal>
      </Flex>
    );
  }
}

export default withTranslation()<AddPeopleToGroup>(
  inject("auth", "users", "groupMemberships", "ui")(AddPeopleToGroup)
);
