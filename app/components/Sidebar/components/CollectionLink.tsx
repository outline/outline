import { Location } from "history";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { NavigationNode } from "@shared/types";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import DocumentReparent from "~/scenes/DocumentReparent";
import Fade from "~/components/Fade";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import NudeButton from "~/components/NudeButton";
import { createDocument } from "~/actions/definitions/documents";
import useActionContext from "~/hooks/useActionContext";
import useBoolean from "~/hooks/useBoolean";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import CollectionMenu from "~/menus/CollectionMenu";
import DropToImport from "./DropToImport";
import EditableTitle from "./EditableTitle";
import Relative from "./Relative";
import SidebarLink, { DragObject } from "./SidebarLink";
import { useStarredContext } from "./StarredContext";

type Props = {
  collection: Collection;
  expanded?: boolean;
  onDisclosureClick: (ev?: React.MouseEvent<HTMLButtonElement>) => void;
  activeDocument: Document | undefined;
  isDraggingAnyCollection?: boolean;
};

const CollectionLink: React.FC<Props> = ({
  collection,
  expanded,
  onDisclosureClick,
  isDraggingAnyCollection,
}: Props) => {
  const itemRef = React.useRef<
    NavigationNode & { depth: number; active: boolean; collectionId: string }
  >();
  const { dialogs, documents, collections } = useStores();
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const [isEditing, setIsEditing] = React.useState(false);
  const can = usePolicy(collection);
  const { t } = useTranslation();
  const history = useHistory();
  const inStarredSection = useStarredContext();

  const handleTitleChange = React.useCallback(
    async (name: string) => {
      await collection.save({
        name,
      });
      history.replace(collection.url, history.location.state);
    },
    [collection, history]
  );

  // Drop to re-parent document
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: "document",
    drop: async (item: DragObject, monitor) => {
      const { id, collectionId } = item;
      if (monitor.didDrop()) {
        return;
      }
      if (!collection) {
        return;
      }

      const document = documents.get(id);
      if (collection.id === collectionId && !document?.parentDocumentId) {
        return;
      }

      const prevCollection = collections.get(collectionId);

      if (
        prevCollection &&
        prevCollection.permission === null &&
        prevCollection.permission !== collection.permission &&
        !document?.isDraft
      ) {
        itemRef.current = item;

        dialogs.openModal({
          title: t("Move document"),
          content: (
            <DocumentReparent
              item={item}
              collection={collection}
              onSubmit={dialogs.closeAllModals}
              onCancel={dialogs.closeAllModals}
            />
          ),
        });
      } else {
        await documents.move(id, collection.id);

        if (!expanded) {
          onDisclosureClick();
        }
      }
    },
    canDrop: () => can.createDocument,
    collect: (monitor) => ({
      isOver: !!monitor.isOver({
        shallow: true,
      }),
      canDrop: monitor.canDrop(),
    }),
  });

  const handleTitleEditing = React.useCallback((isEditing: boolean) => {
    setIsEditing(isEditing);
  }, []);

  const handlePrefetch = React.useCallback(() => {
    void collection.fetchDocuments();
  }, [collection]);

  const context = useActionContext({
    activeCollectionId: collection.id,
    inStarredSection,
  });

  return (
    <>
      <Relative ref={drop}>
        <DropToImport collectionId={collection.id}>
          <SidebarLink
            to={{
              pathname: collection.url,
              state: { starred: inStarredSection },
            }}
            expanded={expanded}
            onDisclosureClick={onDisclosureClick}
            onClickIntent={handlePrefetch}
            icon={
              <CollectionIcon collection={collection} expanded={expanded} />
            }
            showActions={menuOpen}
            isActiveDrop={isOver && canDrop}
            isActive={(match, location: Location<{ starred?: boolean }>) =>
              !!match && location.state?.starred === inStarredSection
            }
            label={
              <EditableTitle
                title={collection.name}
                onSubmit={handleTitleChange}
                onEditing={handleTitleEditing}
                canUpdate={can.update}
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
      </Relative>
    </>
  );
};

export default observer(CollectionLink);
