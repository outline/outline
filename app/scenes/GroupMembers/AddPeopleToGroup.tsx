import { debounce } from "lodash";
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { WithTranslation, withTranslation } from "react-i18next";
import RootStore from "~/stores/RootStore";
import Group from "~/models/Group";
import User from "~/models/User";
import Invite from "~/scenes/Invite";
import ButtonLink from "~/components/ButtonLink";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Modal from "~/components/Modal";
import PaginatedList from "~/components/PaginatedList";
import Text from "~/components/Text";
import withStores from "~/components/withStores";
import GroupMemberListItem from "./components/GroupMemberListItem";

type Props = WithTranslation &
  RootStore & {
    group: Group;
    onSubmit: () => void;
  };

@observer
class AddPeopleToGroup extends React.Component<Props> {
  @observable
  inviteModalOpen = false;

  @observable
  query = "";

  handleInviteModalOpen = () => {
    this.inviteModalOpen = true;
  };

  handleInviteModalClose = () => {
    this.inviteModalOpen = false;
  };

  handleFilter = (ev: React.ChangeEvent<HTMLInputElement>) => {
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
      this.props.toasts.showToast(
        t(`{{userName}} was added to the group`, {
          userName: user.name,
        }),
        {
          type: "success",
        }
      );
    } catch (err) {
      this.props.toasts.showToast(t("Could not add user"), {
        type: "error",
      });
    }
  };

  render() {
    const { users, group, auth, t } = this.props;
    const { user, team } = auth;
    if (!user || !team) {
      return null;
    }

    return (
      <Flex column>
        <Text type="secondary">
          {t(
            "Add team members below to give them access to the group. Need to add someone who’s not yet on the team yet?"
          )}{" "}
          <ButtonLink onClick={this.handleInviteModalOpen}>
            {t("Invite them to {{teamName}}", {
              teamName: team.name,
            })}
          </ButtonLink>
          .
        </Text>
        <Input
          type="search"
          placeholder={`${t("Search by name")}…`}
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
          renderItem={(item: User) => (
            <GroupMemberListItem
              key={item.id}
              user={item}
              onAdd={() => this.handleAddUser(item)}
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

export default withTranslation()(withStores(AddPeopleToGroup));
