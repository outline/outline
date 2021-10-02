// @flow
import { debounce } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Collection from "models/Collection";
import Group from "models/Group";
import GroupNew from "scenes/GroupNew";
import Button from "components/Button";
import ButtonLink from "components/ButtonLink";
import Empty from "components/Empty";
import Flex from "components/Flex";
import GroupListItem from "components/GroupListItem";
import HelpText from "components/HelpText";
import Input from "components/Input";
import Modal from "components/Modal";
import PaginatedList from "components/PaginatedList";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";
type Props = {
  collection: Collection,
  onSubmit: () => void,
};

const AddGroupsToCollection = ({ collection, onSubmit }: Props) => {
  const [newGroupModalOpen, setNewGroupModalOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const { groups, auth, collectionGroupMemberships } = useStores();
  const { t } = useTranslation();
  const { showToast } = useToasts();

  const handleFilter = (ev: SyntheticInputEvent<>) => {
    setQuery(ev.target.value);
    debouncedFetch();
  };

  const debouncedFetch = debounce(() => {
    groups.fetchPage({
      query,
    });
  }, 250);

  const handleAddGroup = (group: Group) => {
    try {
      collectionGroupMemberships.create({
        collectionId: collection.id,
        groupId: group.id,
        permission: "read_write",
      });
      showToast(
        t("{{ groupName }} was added to the collection", {
          groupName: group.name,
        }),
        { type: "success" }
      );
    } catch (err) {
      showToast(t("Could not add user"), { type: "error" });
      console.error(err);
    }
  };

  const { user, team } = auth;
  if (!user || !team) return null;

  return (
    <Flex column>
      <HelpText>
        {t("Can’t find the group you’re looking for?")}{" "}
        <ButtonLink onClick={() => setNewGroupModalOpen(true)}>
          {t("Create a group")}
        </ButtonLink>
        .
      </HelpText>

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
        fetch={query ? undefined : groups.fetchPage}
        renderItem={(item) => (
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
      <Modal
        title={t("Create a group")}
        onRequestClose={() => setNewGroupModalOpen(false)}
        isOpen={newGroupModalOpen}
      >
        <GroupNew onSubmit={() => setNewGroupModalOpen(false)} />
      </Modal>
    </Flex>
  );
};

const ButtonWrap = styled.div`
  margin-left: 6px;
`;

export default observer(AddGroupsToCollection);
