import { debounce } from "lodash";
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { WithTranslation, withTranslation } from "react-i18next";
import RootStore from "~/stores/RootStore";
import Collection from "~/models/Collection";
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
import MemberListItem from "./components/MemberListItem";

type Props = WithTranslation &
  RootStore & {
    collection: Collection;
    onSubmit: () => void;
  };

@observer
class AddPeopleToCollection extends React.Component<Props> {
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

  handleAddUser = (user: User) => {
    const { t } = this.props;

    try {
      this.props.memberships.create({
        collectionId: this.props.collection.id,
        userId: user.id,
        permission: "read_write",
      });
      this.props.toasts.showToast(
        t("{{ userName }} was added to the collection", {
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
    const { users, collection, auth, t } = this.props;
    const { user, team } = auth;
    if (!user || !team) {
      return null;
    }

    return (
      <Flex column>
        <Text type="secondary">
          {t("Need to add someone who’s not yet on the team yet?")}{" "}
          <ButtonLink onClick={this.handleInviteModalOpen}>
            {t("Invite people to {{ teamName }}", {
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
          renderItem={(item: User) => (
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

export default withTranslation()(withStores(AddPeopleToCollection));
