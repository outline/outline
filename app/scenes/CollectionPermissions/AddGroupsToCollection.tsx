import debounce from "lodash/debounce";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
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
import useBoolean from "~/hooks/useBoolean";
import useStores from "~/hooks/useStores";

type Props = {
  collection: Collection;
};

function AddGroupsToCollection(props: Props) {
  const { collection } = props;

  const [newGroupModalOpen, handleNewGroupModalOpen, handleNewGroupModalClose] =
    useBoolean(false);
  const [query, setQuery] = React.useState("");

  const { auth, collectionGroupMemberships, groups, policies } = useStores();
  const { fetchPage: fetchGroups } = groups;

  const { t } = useTranslation();

  const debouncedFetch = React.useMemo(
    () => debounce((query) => fetchGroups({ query }), 250),
    [fetchGroups]
  );

  const handleFilter = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      const updatedQuery = ev.target.value;
      setQuery(updatedQuery);
      void debouncedFetch(updatedQuery);
    },
    [debouncedFetch]
  );

  const handleAddGroup = async (group: Group) => {
    try {
      await collectionGroupMemberships.create({
        collectionId: collection.id,
        groupId: group.id,
      });
      toast.success(
        t("{{ groupName }} was added to the collection", {
          groupName: group.name,
        })
      );
    } catch (err) {
      toast.error(t("Could not add user"));
    }
  };

  const { user, team } = auth;
  if (!user || !team) {
    return null;
  }

  const can = policies.abilities(team.id);

  return (
    <Flex column>
      {can.createGroup ? (
        <Text type="secondary">
          {t("Can’t find the group you’re looking for?")}{" "}
          <ButtonLink onClick={handleNewGroupModalOpen}>
            {t("Create a group")}
          </ButtonLink>
          .
        </Text>
      ) : null}

      <Input
        type="search"
        placeholder={`${t("Search by group name")}…`}
        value={query}
        onChange={handleFilter}
        label={t("Search groups")}
        labelHidden
        flex
      />
      <PaginatedList
        empty={
          query ? (
            <Empty>{t("No groups matching your search")}</Empty>
          ) : (
            <Empty>{t("No groups left to add")}</Empty>
          )
        }
        items={groups.notInCollection(collection.id, query)}
        fetch={query ? undefined : fetchGroups}
        renderItem={(item: Group) => (
          <GroupListItem
            key={item.id}
            group={item}
            showFacepile
            renderActions={() => (
              <ButtonWrap>
                <Button onClick={() => handleAddGroup(item)} neutral>
                  {t("Add")}
                </Button>
              </ButtonWrap>
            )}
          />
        )}
      />
      {can.createGroup ? (
        <Modal
          title={t("Create a group")}
          onRequestClose={handleNewGroupModalClose}
          isOpen={newGroupModalOpen}
        >
          <GroupNew onSubmit={handleNewGroupModalClose} />
        </Modal>
      ) : null}
    </Flex>
  );
}

const ButtonWrap = styled.div`
  margin-left: 6px;
`;

export default observer(AddGroupsToCollection);
