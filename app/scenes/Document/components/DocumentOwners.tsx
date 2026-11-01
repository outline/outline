import { observer } from "mobx-react";
import { CloseIcon, PlusIcon } from "outline-icons";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { errToString } from "@shared/utils/error";
import { DocumentValidation } from "@shared/validations";
import { Avatar, AvatarSize } from "~/components/Avatar";
import FilterOptions from "~/components/FilterOptions";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useDocumentOwners from "~/hooks/useDocumentOwners";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import type Document from "~/models/Document";

type Props = {
  /** The document to display owners for. */
  document: Document;
};

const fetchQueryOptions = { sort: "name", direction: "ASC" };

/**
 * Displays the owners of a document, and allows them to be changed by users
 * that can manage the document.
 */
function DocumentOwners({ document }: Props) {
  const { t } = useTranslation();
  const { users } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(document);
  const canTeam = usePolicy(team);
  const { ownerIds } = document;
  const owners = useDocumentOwners(document);

  const handleSave = useCallback(
    async (nextOwnerIds: string[]) => {
      try {
        await document.save({ ownerIds: nextOwnerIds });
      } catch (err) {
        toast.error(errToString(err));
      }
    },
    [document]
  );

  const handleAdd = useCallback(
    (userId: string | null | undefined) => {
      if (!userId || ownerIds.includes(userId)) {
        return;
      }
      void handleSave([...ownerIds, userId]);
    },
    [ownerIds, handleSave]
  );

  const options = useMemo(
    () =>
      users.all
        .filter(
          (user) =>
            (user.isAdmin || user.isMember) &&
            !user.isSuspended &&
            !ownerIds.includes(user.id)
        )
        .map((user) => ({
          key: user.id,
          label: user.name,
          icon: <Avatar model={user} size={AvatarSize.Small} />,
        })),
    [users.all, ownerIds]
  );

  if (!can.manageOwners && ownerIds.length === 0) {
    return null;
  }

  return (
    <Flex column>
      <Text as="h2" size="large">
        {t("Owners")}
      </Text>
      <ListSpacing>
        {owners.map((owner) => (
          <ListItem
            key={owner.id}
            title={owner.name}
            image={<Avatar model={owner} size={AvatarSize.Large} />}
            actions={
              can.manageOwners ? (
                <Tooltip content={t("Remove owner")}>
                  <NudeButton
                    aria-label={t("Remove owner")}
                    onClick={() =>
                      handleSave(ownerIds.filter((id) => id !== owner.id))
                    }
                  >
                    <CloseIcon size={18} />
                  </NudeButton>
                </Tooltip>
              ) : undefined
            }
            border={false}
            small
          />
        ))}
        {owners.length === 0 && (
          <Text as="p" type="secondary" size="small">
            {t("No owners have been assigned")}
          </Text>
        )}
        {can.manageOwners && ownerIds.length < DocumentValidation.maxOwners && (
          <AddOwner align="center" gap={4}>
            <PlusIcon size={18} />
            <FilterOptions
              options={options}
              selectedKeys={[]}
              onSelect={handleAdd}
              defaultLabel={t("Add owner")}
              fetchQuery={canTeam.listUsers ? users.fetchPage : undefined}
              fetchQueryOptions={fetchQueryOptions}
              showFilter
            />
          </AddOwner>
        )}
      </ListSpacing>
    </Flex>
  );
}

const ListSpacing = styled("div")`
  margin-top: -0.5em;
  margin-bottom: 0.5em;
`;

const AddOwner = styled(Flex)`
  margin-top: 4px;
`;

export default observer(DocumentOwners);
