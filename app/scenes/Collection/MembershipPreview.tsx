import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { PAGINATION_SYMBOL } from "~/stores/BaseStore";
import Collection from "~/models/Collection";
import Facepile from "~/components/Facepile";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import CollectionPermissions from "../CollectionPermissions";

type Props = {
  collection: Collection;
};

const MembershipPreview = ({ collection }: Props) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [totalMemberships, setTotalMemberships] = React.useState(0);
  const { t } = useTranslation();
  const {
    memberships,
    collectionGroupMemberships,
    users,
    dialogs,
  } = useStores();
  const collectionUsers = users.inCollection(collection.id);

  const handlePermissions = React.useCallback(() => {
    dialogs.openModal({
      title: t("Collection permissions"),
      content: <CollectionPermissions collection={collection} />,
    });
  }, [collection, dialogs, t]);

  React.useEffect(() => {
    const fetchData = async () => {
      if (collection.permission) {
        return;
      }
      setIsLoading(true);

      try {
        const options = {
          id: collection.id,
          limit: 8,
        };
        const [users, groups] = await Promise.all([
          memberships.fetchPage(options),
          collectionGroupMemberships.fetchPage(options),
        ]);
        setTotalMemberships(
          users[PAGINATION_SYMBOL].total + groups[PAGINATION_SYMBOL].total
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [
    collection.permission,
    collection.id,
    collectionGroupMemberships,
    memberships,
  ]);

  if (isLoading || collection.permission) {
    return null;
  }

  const overflow = totalMemberships - collectionUsers.length;

  return (
    <Tooltip tooltip={t("Users and groups with access")} delay={250}>
      <NudeButton onClick={handlePermissions} width="auto" height="auto">
        <Fade>
          <Facepile users={collectionUsers} overflow={overflow} />
        </Fade>
      </NudeButton>
    </Tooltip>
  );
};

export default observer(MembershipPreview);
