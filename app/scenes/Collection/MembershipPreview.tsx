import sortBy from "lodash/sortBy";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { PAGINATION_SYMBOL } from "~/stores/BaseStore";
import Collection from "~/models/Collection";
import User from "~/models/User";
import Avatar from "~/components/Avatar";
import Facepile from "~/components/Facepile";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
import { editCollectionPermissions } from "~/actions/definitions/collections";
import useActionContext from "~/hooks/useActionContext";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";

type Props = {
  collection: Collection;
  limit?: number;
};

const MembershipPreview = ({ collection, limit = 8 }: Props) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [usersCount, setUsersCount] = React.useState(0);
  const [groupsCount, setGroupsCount] = React.useState(0);
  const { t } = useTranslation();
  const { memberships, collectionGroupMemberships, users } = useStores();
  const collectionUsers = users.inCollection(collection.id);
  const context = useActionContext();
  const isMobile = useMobile();

  React.useEffect(() => {
    const fetchData = async () => {
      if (collection.permission || isMobile) {
        return;
      }
      setIsLoading(true);

      try {
        const options = {
          id: collection.id,
          limit,
        };
        const [users, groups] = await Promise.all([
          memberships.fetchPage(options),
          collectionGroupMemberships.fetchPage(options),
        ]);
        setUsersCount(users[PAGINATION_SYMBOL].total);
        setGroupsCount(groups[PAGINATION_SYMBOL].total);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [
    isMobile,
    collection.permission,
    collection.id,
    collectionGroupMemberships,
    memberships,
    limit,
  ]);

  if (isLoading || collection.permission || isMobile) {
    return null;
  }

  const overflow = usersCount - groupsCount - collectionUsers.length;

  return (
    <NudeButton
      context={context}
      action={editCollectionPermissions}
      tooltip={{
        tooltip:
          usersCount > 0
            ? groupsCount > 0
              ? groupsCount > 1
                ? t(
                    `{{ usersCount }} users and {{ groupsCount }} groups with access`,
                    { usersCount, groupsCount, count: usersCount }
                  )
                : t(`{{ usersCount }} users and a group have access`, {
                    usersCount,
                    count: usersCount,
                  })
              : t(`{{ usersCount }} users with access`, {
                  usersCount,
                  count: usersCount,
                })
            : t(`{{ groupsCount }} groups with access`, {
                groupsCount,
                count: groupsCount,
              }),
        delay: 250,
      }}
      width="auto"
      height="auto"
    >
      <Fade>
        <Facepile
          users={sortBy(collectionUsers, "lastActiveAt")}
          overflow={overflow}
          limit={limit}
          renderAvatar={(user) => <StyledAvatar model={user} size={32} />}
        />
      </Fade>
    </NudeButton>
  );
};

const StyledAvatar = styled(Avatar)<{ model: User }>`
  transition: opacity 250ms ease-in-out;
  opacity: ${(props) => (props.model.isRecentlyActive ? 1 : 0.5)};
`;

export default observer(MembershipPreview);
