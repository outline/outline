import { ArchiveIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Collection from "~/models/Collection";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import { MenuInternalLink } from "~/types";
import { archivePath, collectionPath } from "~/utils/routeHelpers";
import Breadcrumb from "./Breadcrumb";

type Props = {
  collection: Collection;
};

export const CollectionBreadcrumb: React.FC<Props> = ({ collection }) => {
  const { t } = useTranslation();

  const items = React.useMemo(() => {
    const collectionNode: MenuInternalLink = {
      type: "route",
      title: collection.name,
      icon: <CollectionIcon collection={collection} expanded />,
      to: collectionPath(collection.path),
    };

    const category: MenuInternalLink | undefined = collection.isArchived
      ? {
          type: "route",
          icon: <ArchiveIcon />,
          title: t("Archive"),
          to: archivePath(),
        }
      : undefined;

    const output = [];
    if (category) {
      output.push(category);
    }

    output.push(collectionNode);

    return output;
  }, [collection, t]);

  return <Breadcrumb items={items} highlightFirstItem />;
};
