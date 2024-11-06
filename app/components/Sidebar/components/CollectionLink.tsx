import { Location } from "history";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import { CollectionValidation } from "@shared/validations";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import ConfirmMoveDialog from "~/components/ConfirmMoveDialog";
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
import EditableTitle, { RefHandle } from "./EditableTitle";
import Relative from "./Relative";
import { SidebarContextType, useSidebarContext } from "./SidebarContext";
import SidebarLink, { DragObject } from "./SidebarLink";

type Props = {
  collection: Collection;
  expanded?: boolean;
  onDisclosureClick: (ev?: React.MouseEvent<HTMLButtonElement>) => void;
  activeDocument: Document | undefined;
  isDraggingAnyCollection?: boolean;
  depth?: number;
  onClick?: () => void;
};

const CollectionLink: React.FC<Props> = ({
  collection,
  expanded,
  onDisclosureClick,
  isDraggingAnyCollection,
  depth,
  onClick,
}: Props) => {
  const { dialogs, documents, collections } = useStores();
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const [isEditing, setIsEditing] = React.useState(false);
  const can = usePolicy(collection);
  const { t } = useTranslation();
  const sidebarContext = useSidebarContext();
  const editableTitleRef = React.useRef<RefHandle>(null);

  const handleTitleChange = React.useCallback(
    async (name: string) => {
      await collection.save({
        name,
      });
    },
    [collection]
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
        prevCollection.permission !== collection.permission &&
        !document?.isDraft
      ) {
        dialogs.openModal({
          title: t("Change permissions?"),
          content: <ConfirmMoveDialog item={item} collection={collection} />,
        });
      } else {
        await documents.move({ documentId: id, collectionId: collection.id });

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

  const handlePrefetch = React.useCallback(() => {
    void collection.fetchDocuments();
  }, [collection]);

  const context = useActionContext({
    activeCollectionId: collection.id,
    sidebarContext,
  });

  const handleRename = React.useCallback(() => {
    editableTitleRef.current?.setIsEditing(true);
  }, [editableTitleRef]);

  return (
    <Relative ref={drop}>
      <DropToImport collectionId={collection.id}>
        <SidebarLink
          onClick={onClick}
          to={{
            pathname: collection.path,
            state: { sidebarContext },
          }}
          expanded={expanded}
          onDisclosureClick={onDisclosureClick}
          onClickIntent={handlePrefetch}
          icon={<CollectionIcon collection={collection} expanded={expanded} />}
          showActions={menuOpen}
          isActiveDrop={isOver && canDrop}
          isActive={(
            match,
            location: Location<{ sidebarContext?: SidebarContextType }>
          ) => !!match && location.state?.sidebarContext === sidebarContext}
          label={
            <EditableTitle
              title={collection.name}
              onSubmit={handleTitleChange}
              onEditing={setIsEditing}
              canUpdate={can.update}
              maxLength={CollectionValidation.maxNameLength}
              ref={editableTitleRef}
            />
          }
          exact={false}
          depth={depth ? depth : 0}
          menu={
            !isEditing &&
            !isDraggingAnyCollection && (
              <Fade>
                <NudeButton
                  tooltip={{ content: t("New doc"), delay: 500 }}
                  action={createDocument}
                  context={context}
                  hideOnActionDisabled
                >
                  <PlusIcon />
                </NudeButton>
                <CollectionMenu
                  collection={collection}
                  onRename={handleRename}
                  onOpen={handleMenuOpen}
                  onClose={handleMenuClose}
                />
              </Fade>
            )
          }
        />
      </DropToImport>
    </Relative>
  );
};

export default observer(CollectionLink);
