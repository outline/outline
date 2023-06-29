import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
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
import useBoolean from "~/hooks/useBoolean";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useDebouncedCallback from "~/hooks/useDebouncedCallback";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import MemberListItem from "./components/MemberListItem";

type Props = {
  collection: Collection;
};

function AddPeopleToCollection({ collection }: Props) {
  const { memberships, users } = useStores();
  const { showToast } = useToasts();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const [inviteModalOpen, setInviteModalOpen, setInviteModalClosed] =
    useBoolean();
  const [query, setQuery] = React.useState("");

  const handleFilter = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(ev.target.value);
    debouncedFetch(ev.target.value);
  };

  const debouncedFetch = useDebouncedCallback(
    (query) =>
      users.fetchPage({
        query,
      }),
    250
  );

  const handleAddUser = async (user: User) => {
    try {
      await memberships.create({
        collectionId: collection.id,
        userId: user.id,
      });
      showToast(
        t("{{ userName }} was added to the collection", {
          userName: user.name,
        }),
        {
          type: "success",
        }
      );
    } catch (err) {
      showToast(t("Could not add user"), {
        type: "error",
      });
    }
  };

  return (
    <Flex column>
      <Text type="secondary">
        {t("Need to add someone who’s not yet on the team yet?")}{" "}
        <ButtonLink onClick={setInviteModalOpen}>
          {t("Invite people to {{ teamName }}", {
            teamName: team.name,
          })}
        </ButtonLink>
        .
      </Text>
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
        renderItem={(item: User) => (
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
        onRequestClose={setInviteModalClosed}
        isOpen={inviteModalOpen}
      >
        <Invite onSubmit={setInviteModalClosed} />
      </Modal>
    </Flex>
  );
}

export default observer(AddPeopleToCollection);
