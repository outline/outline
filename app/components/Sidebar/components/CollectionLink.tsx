import { Location } from "history";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import CollectionIcon from "~/components/CollectionIcon";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
import { createDocument } from "~/actions/definitions/documents";
import useActionContext from "~/hooks/useActionContext";
import useBoolean from "~/hooks/useBoolean";
import usePolicy from "~/hooks/usePolicy";
import CollectionMenu from "~/menus/CollectionMenu";
import DropToImport from "./DropToImport";
import EditableTitle from "./EditableTitle";
import SidebarLink from "./SidebarLink";
import { useStarredContext } from "./StarredContext";

type Props = {
  collection: Collection;
  expanded: boolean;
  onDisclosureClick: (ev: React.MouseEvent<HTMLButtonElement>) => void;
  activeDocument: Document | undefined;
  isActiveDrop?: boolean;
  isDraggingAnyCollection?: boolean;
};

const CollectionLink: React.FC<Props> = ({
  collection,
  expanded,
  onDisclosureClick,
  isActiveDrop,
  isDraggingAnyCollection,
}) => {
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const [isEditing, setIsEditing] = React.useState(false);
  const canUpdate = usePolicy(collection.id).update;
  const { t } = useTranslation();
  const history = useHistory();
  const inStarredSection = useStarredContext();

  const handleTitleChange = React.useCallback(
    async (name: string) => {
      await collection.save({
        name,
      });
      history.push(collection.url);
    },
    [collection, history]
  );

  const handleTitleEditing = React.useCallback((isEditing: boolean) => {
    setIsEditing(isEditing);
  }, []);

  const context = useActionContext({
    activeCollectionId: collection.id,
  });

  return (
    <DropToImport collectionId={collection.id}>
      <SidebarLink
        to={{
          pathname: collection.url,
          state: { starred: inStarredSection },
        }}
        expanded={expanded}
        onDisclosureClick={onDisclosureClick}
        icon={<CollectionIcon collection={collection} expanded={expanded} />}
        showActions={menuOpen}
        isActiveDrop={isActiveDrop}
        isActive={(match, location: Location<{ starred?: boolean }>) =>
          !!match && location.state?.starred === inStarredSection
        }
        label={
          <EditableTitle
            title={collection.name}
            onSubmit={handleTitleChange}
            onEditing={handleTitleEditing}
            canUpdate={canUpdate}
          />
        }
        exact={false}
        depth={0}
        menu={
          !isEditing &&
          !isDraggingAnyCollection && (
            <Fade>
              <NudeButton
                tooltip={{ tooltip: t("New doc"), delay: 500 }}
                action={createDocument}
                context={context}
                hideOnActionDisabled
              >
                <PlusIcon />
              </NudeButton>
              <CollectionMenu
                collection={collection}
                onOpen={handleMenuOpen}
                onClose={handleMenuClose}
              />
            </Fade>
          )
        }
      />
    </DropToImport>
  );
};

export default observer(CollectionLink);
