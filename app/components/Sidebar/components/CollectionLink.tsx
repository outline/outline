import { Location } from "history";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { mergeRefs } from "react-merge-refs";
import { CollectionValidation } from "@shared/validations";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import Fade from "~/components/Fade";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import NudeButton from "~/components/NudeButton";
import { createDocument } from "~/actions/definitions/documents";
import useActionContext from "~/hooks/useActionContext";
import useBoolean from "~/hooks/useBoolean";
import usePolicy from "~/hooks/usePolicy";
import CollectionMenu from "~/menus/CollectionMenu";
import { useDropToChangeCollection } from "../hooks/useDragAndDrop";
import DropToImport from "./DropToImport";
import EditableTitle, { RefHandle } from "./EditableTitle";
import Relative from "./Relative";
import { SidebarContextType, useSidebarContext } from "./SidebarContext";
import SidebarLink from "./SidebarLink";

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

  const handleExpand = React.useCallback(() => {
    if (!expanded) {
      onDisclosureClick();
    }
  }, [expanded, onDisclosureClick]);

  const parentRef = React.useRef<HTMLDivElement>(null);
  const [{ isOver, canDrop }, dropRef] = useDropToChangeCollection(
    collection,
    handleExpand,
    parentRef
  );

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
    <Relative ref={mergeRefs([parentRef, dropRef])}>
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
