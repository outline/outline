// @flow
import { debounce } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Collection from "models/Collection";
import User from "models/User";
import Invite from "scenes/Invite";
import ButtonLink from "components/ButtonLink";
import Empty from "components/Empty";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Input from "components/Input";
import Modal from "components/Modal";
import PaginatedList from "components/PaginatedList";
import MemberListItem from "./components/MemberListItem";
import useCurrentTeam from "hooks/useCurrentTeam";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";
type Props = {
  collection: Collection,
  onSubmit: () => void,
};

const AddPeopleToCollection = ({ collection, onSubmit }: Props) => {
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const team = useCurrentTeam();
  const { users, memberships, policies } = useStores();
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const can = policies.abilities(team.id);

  const handleFilter = (ev: SyntheticInputEvent<>) => {
    setQuery(ev.target.value);
    debouncedFetch();
  };

  const debouncedFetch = debounce(() => {
    users.fetchPage({
      query,
    });
  }, 250);

  const handleAddUser = (user: User) => {
    try {
      memberships.create({
        collectionId: collection.id,
        userId: user.id,
        permission: "read_write",
      });
      showToast(
        t("{{ userName }} was added to the collection", {
          userName: user.name,
        }),
        { type: "success" }
      );
    } catch (err) {
      showToast(t("Could not add user"), { type: "error" });
    }
  };

  return (
    <Flex column>
      {can.inviteUser && (
        <HelpText>
          {t("Need to add someone who’s not yet on the team yet?")}{" "}
          <ButtonLink onClick={() => setInviteModalOpen(true)}>
            {t("Invite people to {{ teamName }}", { teamName: team.name })}
          </ButtonLink>
        </HelpText>
      )}

      <Input
        type="search"
        placeholder={`${t("Search by name")}…`}
        value={query}
        onChange={handleFilter}
        label={t("Search people")}
        autoFocus
        labelHidden
        flex
      />
      <PaginatedList
        empty={
          query ? (
            <Empty>{t("No people matching your search")}</Empty>
          ) : (
            <Empty>{t("No people left to add")}</Empty>
          )
        }
        items={users.notInCollection(collection.id, query)}
        fetch={query ? undefined : users.fetchPage}
        renderItem={(item) => (
          <MemberListItem
            key={item.id}
            user={item}
            onAdd={() => handleAddUser(item)}
            canEdit
          />
        )}
      />
      <Modal
        title={t("Invite people")}
        onRequestClose={() => setInviteModalOpen(false)}
        isOpen={inviteModalOpen}
      >
        <Invite onSubmit={() => setInviteModalOpen(false)} />
      </Modal>
    </Flex>
  );
};

export default observer(AddPeopleToCollection);
