import type { Location } from "history";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { mergeRefs } from "react-merge-refs";
import { useHistory } from "react-router-dom";
import { UserPreference } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { CollectionValidation, DocumentValidation } from "@shared/validations";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import type { RefHandle } from "~/components/EditableTitle";
import EditableTitle from "~/components/EditableTitle";
import Fade from "~/components/Fade";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import NudeButton from "~/components/NudeButton";
import useBoolean from "~/hooks/useBoolean";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import CollectionMenu from "~/menus/CollectionMenu";
import { documentEditPath } from "~/utils/routeHelpers";
import { useDropToChangeCollection } from "../hooks/useDragAndDrop";
import DropToImport from "./DropToImport";
import Relative from "./Relative";
import type { SidebarContextType } from "./SidebarContext";
import { useSidebarContext } from "./SidebarContext";
import SidebarLink from "./SidebarLink";
import { useCollectionMenuAction } from "~/hooks/useCollectionMenuAction";
import { ActionContextProvider } from "~/hooks/useActionContext";
import CollectionLinkChildren from "./CollectionLinkChildren";

type Props = {
  collection: Collection;
  expanded?: boolean;
  onDisclosureClick: (ev?: React.MouseEvent<HTMLElement>) => void;
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
  const { documents } = useStores();
  const history = useHistory();
  const can = usePolicy(collection);
  const { t } = useTranslation();
  const sidebarContext = useSidebarContext();
  const user = useCurrentUser();
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

  const handleRename = React.useCallback(() => {
    editableTitleRef.current?.setIsEditing(true);
  }, [editableTitleRef]);

  const newChildTitleRef = React.useRef<RefHandle>(null);
  const [isAddingNewChild, setIsAddingNewChild, closeAddingNewChild] =
    useBoolean();

  const handleNewDoc = React.useCallback(
    async (input) => {
      try {
        newChildTitleRef.current?.setIsEditing(false);
        const newDocument = await documents.create(
          {
            collectionId: collection.id,
            title: input,
            fullWidth: user.getPreference(UserPreference.FullWidthDocuments),
            data: ProsemirrorHelper.getEmptyDocument(),
          },
          { publish: true }
        );
        collection?.addDocument(newDocument);

        closeAddingNewChild();
        history.push({
          pathname: documentEditPath(newDocument),
          state: { sidebarContext },
        });
      } catch (_err) {
        newChildTitleRef.current?.setIsEditing(true);
      }
    },
    [user, sidebarContext, closeAddingNewChild, history, collection, documents]
  );

  const contextMenuAction = useCollectionMenuAction({
    collectionId: collection.id,
  });

  return (
    <ActionContextProvider value={{ activeCollectionId: collection.id }}>
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
            contextAction={contextMenuAction}
            icon={
              <CollectionIcon collection={collection} expanded={expanded} />
            }
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
                  {can.createDocument && (
                    <NudeButton
                      tooltip={{ content: t("New doc"), delay: 500 }}
                      aria-label={t("New nested document")}
                      onClick={(ev) => {
                        ev.preventDefault();
                        setIsAddingNewChild();
                        handleExpand();
                      }}
                    >
                      <PlusIcon />
                    </NudeButton>
                  )}
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
      <CollectionLinkChildren
        collection={collection}
        expanded={!!expanded}
        prefetchDocument={documents.prefetchDocument}
      >
        {isAddingNewChild ? (
          <SidebarLink
            depth={2}
            isActive={() => true}
            label={
              <EditableTitle
                title=""
                canUpdate
                isEditing
                placeholder={`${t("New doc")}…`}
                onCancel={closeAddingNewChild}
                onSubmit={handleNewDoc}
                maxLength={DocumentValidation.maxTitleLength}
                ref={newChildTitleRef}
              />
            }
          />
        ) : undefined}
      </CollectionLinkChildren>
    </ActionContextProvider>
  );
};

export default observer(CollectionLink);
