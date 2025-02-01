import sortBy from "lodash/sortBy";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { PAGINATION_SYMBOL } from "~/stores/base/Store";
import Collection from "~/models/Collection";
import { AvatarSize } from "~/components/Avatar";
import Facepile from "~/components/Facepile";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
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
  const { memberships, groupMemberships, users } = useStores();
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
          groupMemberships.fetchPage(options),
        ]);
        if (users[PAGINATION_SYMBOL]) {
          setUsersCount(users[PAGINATION_SYMBOL].total ?? 0);
        }
        if (groups[PAGINATION_SYMBOL]) {
          setGroupsCount(groups[PAGINATION_SYMBOL].total ?? 0);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [
    isMobile,
    collection.permission,
    collection.id,
    groupMemberships,
    memberships,
    limit,
  ]);

  if (isLoading || collection.permission || isMobile) {
    return null;
  }

  const overflow = usersCount + groupsCount - collectionUsers.length;

  return (
    <NudeButton
      context={context}
      tooltip={{
        content:
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
          size={AvatarSize.Large}
          users={sortBy(collectionUsers, "lastActiveAt")}
          overflow={overflow}
          limit={limit}
        />
      </Fade>
    </NudeButton>
  );
};

export default observer(MembershipPreview);
