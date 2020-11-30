// @flow
import { debounce } from "lodash";
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { withTranslation, type TFunction } from "react-i18next";
import AuthStore from "stores/AuthStore";
import MembershipsStore from "stores/MembershipsStore";
import UiStore from "stores/UiStore";
import UsersStore from "stores/UsersStore";
import Collection from "models/Collection";
import User from "models/User";
import Invite from "scenes/Invite";
import Empty from "components/Empty";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Input from "components/Input";
import Modal from "components/Modal";
import PaginatedList from "components/PaginatedList";
import MemberListItem from "./components/MemberListItem";

type Props = {
  ui: UiStore,
  auth: AuthStore,
  collection: Collection,
  memberships: MembershipsStore,
  users: UsersStore,
  onSubmit: () => void,
  t: TFunction,
};

@observer
class AddPeopleToCollection extends React.Component<Props> {
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

  handleAddUser = (user: User) => {
    const { t } = this.props;
    try {
      this.props.memberships.create({
        collectionId: this.props.collection.id,
        userId: user.id,
        permission: "read_write",
      });
      this.props.ui.showToast(
        t("{{ userName }} was added to the collection", { userName: user.name })
      );
    } catch (err) {
      this.props.ui.showToast(t("Could not add user"));
    }
  };

  render() {
    const { users, collection, auth, t } = this.props;
    const { user, team } = auth;
    if (!user || !team) return null;

    return (
      <Flex column>
        <HelpText>
          {t("Need to add someone who’s not yet on the team yet?")}{" "}
          <a role="button" onClick={this.handleInviteModalOpen}>
            {t("Invite people to {{ teamName }}", { teamName: team.name })}
          </a>
          .
        </HelpText>

        <Input
          type="search"
          placeholder={t("Search by name…")}
          value={this.query}
          onChange={this.handleFilter}
          label={t("Search people")}
          autoFocus
          labelHidden
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
          items={users.notInCollection(collection.id, this.query)}
          fetch={this.query ? undefined : users.fetchPage}
          renderItem={(item) => (
            <MemberListItem
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

export default withTranslation()<AddPeopleToCollection>(
  inject("auth", "users", "memberships", "ui")(AddPeopleToCollection)
);
