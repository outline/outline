import { ArchiveIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Collection from "~/models/Collection";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import { archivePath, collectionPath } from "~/utils/routeHelpers";
import Breadcrumb from "./Breadcrumb";
import { createInternalLinkActionV2 } from "~/actions";
import { ActiveCollectionSection } from "~/actions/sections";

type Props = {
  collection: Collection;
};

export const CollectionBreadcrumb: React.FC<Props> = ({ collection }) => {
  const { t } = useTranslation();

  const actions = React.useMemo(
    () => [
      createInternalLinkActionV2({
        name: t("Archive"),
        section: ActiveCollectionSection,
        icon: <ArchiveIcon />,
        visible: collection.isArchived,
        to: archivePath(),
      }),
      createInternalLinkActionV2({
        name: collection.name,
        section: ActiveCollectionSection,
        icon: <CollectionIcon collection={collection} expanded />,
        to: collectionPath(collection.path),
      }),
    ],
    [collection, t]
  );

  return <Breadcrumb actions={actions} highlightFirstItem />;
};
