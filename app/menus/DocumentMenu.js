// @flow
import { observer } from "mobx-react";
import {
  EditIcon,
  PinIcon,
  StarredIcon,
  UnstarredIcon,
  DuplicateIcon,
  ArchiveIcon,
  TrashIcon,
  MoveIcon,
  HistoryIcon,
  UnpublishIcon,
  ShapesIcon,
  PrintIcon,
  ImportIcon,
  NewDocumentIcon,
  DownloadIcon,
  BuildingBlocksIcon,
  RestoreIcon,
  CrossIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useMenuState, MenuButton } from "reakit/Menu";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import styled from "styled-components";
import Document from "models/Document";
import DocumentDelete from "scenes/DocumentDelete";
import DocumentMove from "scenes/DocumentMove";
import DocumentPermanentDelete from "scenes/DocumentPermanentDelete";
import DocumentTemplatize from "scenes/DocumentTemplatize";
import CollectionIcon from "components/CollectionIcon";
import ContextMenu from "components/ContextMenu";
import OverflowMenuButton from "components/ContextMenu/OverflowMenuButton";
import Template from "components/ContextMenu/Template";
import Flex from "components/Flex";
import Modal from "components/Modal";
import useCurrentTeam from "hooks/useCurrentTeam";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";
import getDataTransferFiles from "utils/getDataTransferFiles";
import {
  documentHistoryUrl,
  documentUrl,
  editDocumentUrl,
  newDocumentPath,
} from "utils/routeHelpers";

type Props = {|
  document: Document,
  className: string,
  isRevision?: boolean,
  showPrint?: boolean,
  modal?: boolean,
  showToggleEmbeds?: boolean,
  showPin?: boolean,
  label?: (any) => React.Node,
  onOpen?: () => void,
  onClose?: () => void,
|};

function DocumentMenu({
  document,
  isRevision,
  className,
  modal = true,
  showToggleEmbeds,
  showPrint,
  showPin,
  label,
  onOpen,
  onClose,
}: Props) {
  const team = useCurrentTeam();
  const { policies, collections, documents } = useStores();
  const { showToast } = useToasts();
  const menu = useMenuState({
    modal,
    unstable_preventOverflow: true,
    unstable_fixed: true,
    unstable_flip: true,
  });
  const history = useHistory();
  const { t } = useTranslation();
  const [renderModals, setRenderModals] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [
    showPermanentDeleteModal,
    setShowPermanentDeleteModal,
  ] = React.useState(false);
  const [showMoveModal, setShowMoveModal] = React.useState(false);
  const [showTemplateModal, setShowTemplateModal] = React.useState(false);
  const file = React.useRef<?HTMLInputElement>();

  const handleOpen = React.useCallback(() => {
    setRenderModals(true);
    if (onOpen) {
      onOpen();
    }
  }, [onOpen]);

  const handleDuplicate = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      const duped = await document.duplicate();

      // when duplicating, go straight to the duplicated document content
      history.push(duped.url);
      showToast(t("Document duplicated"), { type: "success" });
    },
    [t, history, showToast, document]
  );

  const handleArchive = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      await document.archive();
      showToast(t("Document archived"), { type: "success" });
    },
    [showToast, t, document]
  );

  const handleRestore = React.useCallback(
    async (ev: SyntheticEvent<>, options?: { collectionId: string }) => {
      await document.restore(options);
      showToast(t("Document restored"), { type: "success" });
    },
    [showToast, t, document]
  );

  const handleUnpublish = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      await document.unpublish();
      showToast(t("Document unpublished"), { type: "success" });
    },
    [showToast, t, document]
  );

  const handlePrint = React.useCallback(
    (ev: SyntheticEvent<>) => {
      menu.hide();
      window.print();
    },
    [menu]
  );

  const handleStar = React.useCallback(
    (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      ev.stopPropagation();
      document.star();
    },
    [document]
  );

  const handleUnstar = React.useCallback(
    (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      ev.stopPropagation();
      document.unstar();
    },
    [document]
  );

  const collection = collections.get(document.collectionId);
  const can = policies.abilities(document.id);
  const canViewHistory = can.read && !can.restore;
  const restoreItems = React.useMemo(
    () => [
      ...collections.orderedData.reduce((filtered, collection) => {
        const can = policies.abilities(collection.id);

        if (can.update) {
          filtered.push({
            onClick: (ev) => handleRestore(ev, { collectionId: collection.id }),
            title: (
              <Flex align="center">
                <CollectionIcon collection={collection} />
                <CollectionName>{collection.name}</CollectionName>
              </Flex>
            ),
          });
        }
        return filtered;
      }, []),
    ],
    [collections.orderedData, handleRestore, policies]
  );

  const stopPropagation = React.useCallback((ev: SyntheticEvent<>) => {
    ev.stopPropagation();
  }, []);

  const handleImportDocument = React.useCallback(
    (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      ev.stopPropagation();

      // simulate a click on the file upload input element
      if (file.current) {
        file.current.click();
      }
    },
    [file]
  );

  const handleFilePicked = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      const files = getDataTransferFiles(ev);

      // Because this is the onChange handler it's possible for the change to be
      // from previously selecting a file to not selecting a file – aka empty
      if (!files.length) {
        return;
      }

      if (!collection) {
        return;
      }

      try {
        const file = files[0];
        const importedDocument = await documents.import(
          file,
          document.id,
          collection.id,
          {
            publish: true,
          }
        );
        history.push(importedDocument.url);
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });

        throw err;
      }
    },
    [history, showToast, collection, documents, document.id]
  );

  return (
    <>
      <VisuallyHidden>
        <input
          type="file"
          ref={file}
          onChange={handleFilePicked}
          onClick={stopPropagation}
          accept={documents.importFileTypes.join(", ")}
          tabIndex="-1"
        />
      </VisuallyHidden>
      {label ? (
        <MenuButton {...menu}>{label}</MenuButton>
      ) : (
        <OverflowMenuButton
          className={className}
          aria-label={t("Show menu")}
          {...menu}
        />
      )}
      <ContextMenu
        {...menu}
        aria-label={t("Document options")}
        onOpen={handleOpen}
        onClose={onClose}
      >
        <Template
          {...menu}
          items={[
            {
              title: t("Restore"),
              visible: (!!collection && can.restore) || can.unarchive,
              onClick: handleRestore,
              icon: <RestoreIcon />,
            },
            {
              title: t("Restore"),
              visible:
                !collection && !!can.restore && restoreItems.length !== 0,
              style: {
                left: -170,
                position: "relative",
                top: -40,
              },
              icon: <RestoreIcon />,
              hover: true,
              items: [
                {
                  type: "heading",
                  title: t("Choose a collection"),
                },
                ...restoreItems,
              ],
            },
            {
              title: t("Unpin"),
              onClick: document.unpin,
              visible: !!(showPin && document.pinned && can.unpin),
              icon: <PinIcon />,
            },
            {
              title: t("Pin to collection"),
              onClick: document.pin,
              visible: !!(showPin && !document.pinned && can.pin),
              icon: <PinIcon />,
            },
            {
              title: t("Unstar"),
              onClick: handleUnstar,
              visible: document.isStarred && !!can.unstar,
              icon: <UnstarredIcon />,
            },
            {
              title: t("Star"),
              onClick: handleStar,
              visible: !document.isStarred && !!can.star,
              icon: <StarredIcon />,
            },
            {
              type: "separator",
            },
            {
              title: t("Edit"),
              to: editDocumentUrl(document),
              visible: !!can.update && !team.collaborativeEditing,
              icon: <EditIcon />,
            },
            {
              title: t("New nested document"),
              to: newDocumentPath(document.collectionId, {
                parentDocumentId: document.id,
              }),
              visible: !!can.createChildDocument,
              icon: <NewDocumentIcon />,
            },
            {
              title: t("Import document"),
              visible: can.createChildDocument,
              onClick: handleImportDocument,
              icon: <ImportIcon />,
            },
            {
              title: `${t("Create template")}…`,
              onClick: () => setShowTemplateModal(true),
              visible: !!can.update && !document.isTemplate,
              icon: <ShapesIcon />,
            },
            {
              title: t("Duplicate"),
              onClick: handleDuplicate,
              visible: !!can.update,
              icon: <DuplicateIcon />,
            },
            {
              title: t("Unpublish"),
              onClick: handleUnpublish,
              visible: !!can.unpublish,
              icon: <UnpublishIcon />,
            },
            {
              title: t("Archive"),
              onClick: handleArchive,
              visible: !!can.archive,
              icon: <ArchiveIcon />,
            },
            {
              title: `${t("Delete")}…`,
              onClick: () => setShowDeleteModal(true),
              visible: !!can.delete,
              icon: <TrashIcon />,
            },
            {
              title: `${t("Permanently delete")}…`,
              onClick: () => setShowPermanentDeleteModal(true),
              visible: can.permanentDelete,
              icon: <CrossIcon />,
            },
            {
              title: `${t("Move")}…`,
              onClick: () => setShowMoveModal(true),
              visible: !!can.move,
              icon: <MoveIcon />,
            },
            {
              title: t("Enable embeds"),
              onClick: document.enableEmbeds,
              visible:
                !!showToggleEmbeds &&
                document.embedsDisabled &&
                !team.collaborativeEditing,
              icon: <BuildingBlocksIcon />,
            },
            {
              title: t("Disable embeds"),
              onClick: document.disableEmbeds,
              visible:
                !!showToggleEmbeds &&
                !document.embedsDisabled &&
                !team.collaborativeEditing,
              icon: <BuildingBlocksIcon />,
            },
            {
              type: "separator",
            },
            {
              title: t("History"),
              to: isRevision
                ? documentUrl(document)
                : documentHistoryUrl(document),
              visible: canViewHistory,
              icon: <HistoryIcon />,
            },
            {
              title: t("Download"),
              onClick: document.download,
              visible: !!can.download,
              icon: <DownloadIcon />,
            },
            {
              title: t("Print"),
              onClick: handlePrint,
              visible: !!showPrint,
              icon: <PrintIcon />,
            },
          ]}
        />
      </ContextMenu>
      {renderModals && (
        <>
          {can.move && (
            <Modal
              title={t("Move {{ documentName }}", {
                documentName: document.noun,
              })}
              onRequestClose={() => setShowMoveModal(false)}
              isOpen={showMoveModal}
            >
              <DocumentMove
                document={document}
                onRequestClose={() => setShowMoveModal(false)}
              />
            </Modal>
          )}
          {can.delete && (
            <Modal
              title={t("Delete {{ documentName }}", {
                documentName: document.noun,
              })}
              onRequestClose={() => setShowDeleteModal(false)}
              isOpen={showDeleteModal}
            >
              <DocumentDelete
                document={document}
                onSubmit={() => setShowDeleteModal(false)}
              />
            </Modal>
          )}
          {can.permanentDelete && (
            <Modal
              title={t("Permanently delete {{ documentName }}", {
                documentName: document.noun,
              })}
              onRequestClose={() => setShowPermanentDeleteModal(false)}
              isOpen={showPermanentDeleteModal}
            >
              <DocumentPermanentDelete
                document={document}
                onSubmit={() => setShowPermanentDeleteModal(false)}
              />
            </Modal>
          )}
          {can.update && (
            <Modal
              title={t("Create template")}
              onRequestClose={() => setShowTemplateModal(false)}
              isOpen={showTemplateModal}
            >
              <DocumentTemplatize
                documentId={document.id}
                onSubmit={() => setShowTemplateModal(false)}
              />
            </Modal>
          )}
        </>
      )}
    </>
  );
}

const CollectionName = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export default observer(DocumentMenu);
