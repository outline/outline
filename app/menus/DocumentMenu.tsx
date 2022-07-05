import { observer } from "mobx-react";
import {
  EditIcon,
  StarredIcon,
  UnstarredIcon,
  DuplicateIcon,
  ArchiveIcon,
  TrashIcon,
  MoveIcon,
  HistoryIcon,
  UnpublishIcon,
  PrintIcon,
  ImportIcon,
  NewDocumentIcon,
  DownloadIcon,
  RestoreIcon,
  CrossIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useMenuState, MenuButton, MenuButtonHTMLProps } from "reakit/Menu";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import getDataTransferFiles from "@shared/utils/getDataTransferFiles";
import Document from "~/models/Document";
import DocumentDelete from "~/scenes/DocumentDelete";
import DocumentMove from "~/scenes/DocumentMove";
import DocumentPermanentDelete from "~/scenes/DocumentPermanentDelete";
import CollectionIcon from "~/components/CollectionIcon";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Separator from "~/components/ContextMenu/Separator";
import Template from "~/components/ContextMenu/Template";
import Flex from "~/components/Flex";
import Modal from "~/components/Modal";
import Switch from "~/components/Switch";
import { actionToMenuItem } from "~/actions";
import { pinDocument, createTemplate } from "~/actions/definitions/documents";
import useActionContext from "~/hooks/useActionContext";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useMobile from "~/hooks/useMobile";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import { MenuItem } from "~/types";
import {
  documentHistoryUrl,
  documentUrl,
  editDocumentUrl,
  newDocumentPath,
} from "~/utils/routeHelpers";

type Props = {
  document: Document;
  className?: string;
  isRevision?: boolean;
  /** Pass true if the document is currently being displayed */
  showDisplayOptions?: boolean;
  modal?: boolean;
  showToggleEmbeds?: boolean;
  showPin?: boolean;
  label?: (props: MenuButtonHTMLProps) => React.ReactNode;
  onOpen?: () => void;
  onClose?: () => void;
};

function DocumentMenu({
  document,
  isRevision,
  className,
  modal = true,
  showToggleEmbeds,
  showDisplayOptions,
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
  const context = useActionContext({
    isContextMenu: true,
    activeDocumentId: document.id,
    activeCollectionId: document.collectionId,
  });
  const { t } = useTranslation();
  const isMobile = useMobile();
  const [renderModals, setRenderModals] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [
    showPermanentDeleteModal,
    setShowPermanentDeleteModal,
  ] = React.useState(false);
  const [showMoveModal, setShowMoveModal] = React.useState(false);
  const file = React.useRef<HTMLInputElement>(null);

  const handleOpen = React.useCallback(() => {
    setRenderModals(true);

    if (onOpen) {
      onOpen();
    }
  }, [onOpen]);

  const handleDuplicate = React.useCallback(async () => {
    const duped = await document.duplicate();
    // when duplicating, go straight to the duplicated document content
    history.push(duped.url);
    showToast(t("Document duplicated"), {
      type: "success",
    });
  }, [t, history, showToast, document]);

  const handleArchive = React.useCallback(async () => {
    await document.archive();
    showToast(t("Document archived"), {
      type: "success",
    });
  }, [showToast, t, document]);

  const handleRestore = React.useCallback(
    async (
      ev: React.SyntheticEvent,
      options?: {
        collectionId: string;
      }
    ) => {
      await document.restore(options);
      showToast(t("Document restored"), {
        type: "success",
      });
    },
    [showToast, t, document]
  );

  const handleUnpublish = React.useCallback(async () => {
    await document.unpublish();
    showToast(t("Document unpublished"), {
      type: "success",
    });
  }, [showToast, t, document]);

  const handlePrint = React.useCallback(() => {
    menu.hide();
    window.print();
  }, [menu]);

  const handleStar = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      document.star();
    },
    [document]
  );

  const handleUnstar = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      document.unstar();
    },
    [document]
  );

  const collection = collections.get(document.collectionId);
  const can = usePolicy(document.id);
  const canViewHistory = can.read && !can.restore;
  const restoreItems = React.useMemo(
    () => [
      ...collections.orderedData.reduce<MenuItem[]>((filtered, collection) => {
        const can = policies.abilities(collection.id);

        if (can.update) {
          filtered.push({
            type: "button",
            onClick: (ev) =>
              handleRestore(ev, {
                collectionId: collection.id,
              }),
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
  const stopPropagation = React.useCallback((ev: React.SyntheticEvent) => {
    ev.stopPropagation();
  }, []);

  const handleImportDocument = React.useCallback(
    (ev: React.SyntheticEvent) => {
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
    async (ev: React.FormEvent<HTMLInputElement>) => {
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
        <label>
          {t("Import document")}
          <input
            type="file"
            ref={file}
            onChange={handleFilePicked}
            onClick={stopPropagation}
            accept={documents.importFileTypes.join(", ")}
            tabIndex={-1}
          />
        </label>
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
              type: "button",
              title: t("Restore"),
              visible: (!!collection && can.restore) || can.unarchive,
              onClick: (ev) => handleRestore(ev),
              icon: <RestoreIcon />,
            },
            {
              type: "submenu",
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
              type: "button",
              title: t("Unstar"),
              onClick: handleUnstar,
              visible: document.isStarred && !!can.unstar,
              icon: <UnstarredIcon />,
            },
            {
              type: "button",
              title: t("Star"),
              onClick: handleStar,
              visible: !document.isStarred && !!can.star,
              icon: <StarredIcon />,
            },
            // Pin document
            actionToMenuItem(pinDocument, context),
            {
              type: "separator",
            },
            {
              type: "route",
              title: t("Edit"),
              to: editDocumentUrl(document),
              visible: !!can.update && !team.collaborativeEditing,
              icon: <EditIcon />,
            },
            {
              type: "route",
              title: t("New nested document"),
              to: newDocumentPath(document.collectionId, {
                parentDocumentId: document.id,
              }),
              visible: !!can.createChildDocument,
              icon: <NewDocumentIcon />,
            },
            {
              type: "button",
              title: t("Import document"),
              visible: can.createChildDocument,
              onClick: handleImportDocument,
              icon: <ImportIcon />,
            },
            // Templatize document
            actionToMenuItem(createTemplate, context),
            {
              type: "button",
              title: t("Duplicate"),
              onClick: handleDuplicate,
              visible: !!can.update,
              icon: <DuplicateIcon />,
            },
            {
              type: "button",
              title: t("Unpublish"),
              onClick: handleUnpublish,
              visible: !!can.unpublish,
              icon: <UnpublishIcon />,
            },
            {
              type: "button",
              title: t("Archive"),
              onClick: handleArchive,
              visible: !!can.archive,
              icon: <ArchiveIcon />,
            },
            {
              type: "button",
              title: `${t("Move")}…`,
              onClick: () => setShowMoveModal(true),
              visible: !!can.move,
              icon: <MoveIcon />,
            },
            {
              type: "button",
              title: `${t("Delete")}…`,
              dangerous: true,
              onClick: () => setShowDeleteModal(true),
              visible: !!can.delete,
              icon: <TrashIcon />,
            },
            {
              type: "button",
              title: `${t("Permanently delete")}…`,
              dangerous: true,
              onClick: () => setShowPermanentDeleteModal(true),
              visible: can.permanentDelete,
              icon: <CrossIcon />,
            },
            {
              type: "separator",
            },
            {
              type: "route",
              title: t("History"),
              to: isRevision
                ? documentUrl(document)
                : documentHistoryUrl(document),
              visible: canViewHistory,
              icon: <HistoryIcon />,
            },
            {
              type: "button",
              title: t("Download"),
              onClick: document.download,
              visible: !!can.download,
              icon: <DownloadIcon />,
            },
            {
              type: "button",
              title: t("Print"),
              onClick: handlePrint,
              visible: !!showDisplayOptions,
              icon: <PrintIcon />,
            },
          ]}
        />
        {(showDisplayOptions || showToggleEmbeds) && (
          <>
            <Separator />
            {showToggleEmbeds && (
              <Style>
                <ToggleMenuItem
                  width={26}
                  height={14}
                  label={t("Enable embeds")}
                  checked={!document.embedsDisabled}
                  onChange={
                    document.embedsDisabled
                      ? document.enableEmbeds
                      : document.disableEmbeds
                  }
                />
              </Style>
            )}
            {showDisplayOptions && !isMobile && can.update && (
              <Style>
                <ToggleMenuItem
                  width={26}
                  height={14}
                  label={t("Full width")}
                  checked={document.fullWidth}
                  onChange={(ev) => {
                    document.fullWidth = ev.currentTarget.checked;
                    document.save();
                  }}
                />
              </Style>
            )}
          </>
        )}
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
              isCentered
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
              isCentered
            >
              <DocumentPermanentDelete
                document={document}
                onSubmit={() => setShowPermanentDeleteModal(false)}
              />
            </Modal>
          )}
        </>
      )}
    </>
  );
}

const ToggleMenuItem = styled(Switch)`
  * {
    font-weight: normal;
    color: ${(props) => props.theme.textSecondary};
  }
`;

const Style = styled.div`
  padding: 12px;

  ${breakpoint("tablet")`
    padding: 4px 12px;
    font-size: 14px;
  `};
`;

const CollectionName = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export default observer(DocumentMenu);
