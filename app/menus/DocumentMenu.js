// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useMenuState, MenuButton } from "reakit/Menu";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import styled from "styled-components";
import Document from "models/Document";
import DocumentDelete from "scenes/DocumentDelete";
import DocumentMove from "scenes/DocumentMove";
import DocumentTemplatize from "scenes/DocumentTemplatize";
import CollectionIcon from "components/CollectionIcon";
import ContextMenu from "components/ContextMenu";
import OverflowMenuButton from "components/ContextMenu/OverflowMenuButton";
import Template from "components/ContextMenu/Template";
import Flex from "components/Flex";
import Modal from "components/Modal";
import useStores from "hooks/useStores";
import getDataTransferFiles from "utils/getDataTransferFiles";
import {
  documentHistoryUrl,
  documentUrl,
  editDocumentUrl,
  newDocumentUrl,
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
  const { policies, collections, ui, documents } = useStores();
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
      ui.showToast(t("Document duplicated"), { type: "success" });
    },
    [ui, t, history, document]
  );

  const handleArchive = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      await document.archive();
      ui.showToast(t("Document archived"), { type: "success" });
    },
    [ui, t, document]
  );

  const handleRestore = React.useCallback(
    async (ev: SyntheticEvent<>, options?: { collectionId: string }) => {
      await document.restore(options);
      ui.showToast(t("Document restored"), { type: "success" });
    },
    [ui, t, document]
  );

  const handleUnpublish = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      await document.unpublish();
      ui.showToast(t("Document unpublished"), { type: "success" });
    },
    [ui, t, document]
  );

  const handlePrint = React.useCallback((ev: SyntheticEvent<>) => {
    window.print();
  }, []);

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
        ui.showToast(err.message, {
          type: "error",
        });

        throw err;
      }
    },
    [history, ui, collection, documents, document.id]
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
              visible: !!can.unarchive,
              onClick: handleRestore,
            },
            {
              title: t("Restore"),
              visible: !!(collection && can.restore),
              onClick: handleRestore,
            },
            {
              title: t("Restore"),
              visible: !collection && !!can.restore,
              style: {
                left: -170,
                position: "relative",
                top: -40,
              },
              hover: true,
              items: [
                {
                  type: "heading",
                  title: t("Choose a collection"),
                },
                ...collections.orderedData.map((collection) => {
                  const can = policies.abilities(collection.id);

                  return {
                    title: (
                      <Flex align="center">
                        <CollectionIcon collection={collection} />
                        <CollectionName>{collection.name}</CollectionName>
                      </Flex>
                    ),
                    onClick: (ev) =>
                      handleRestore(ev, { collectionId: collection.id }),
                    disabled: !can.update,
                  };
                }),
              ],
            },
            {
              title: t("Unpin"),
              onClick: document.unpin,
              visible: !!(showPin && document.pinned && can.unpin),
            },
            {
              title: t("Pin to collection"),
              onClick: document.pin,
              visible: !!(showPin && !document.pinned && can.pin),
            },
            {
              title: t("Unstar"),
              onClick: handleUnstar,
              visible: document.isStarred && !!can.unstar,
            },
            {
              title: t("Star"),
              onClick: handleStar,
              visible: !document.isStarred && !!can.star,
            },
            {
              title: t("Enable embeds"),
              onClick: document.enableEmbeds,
              visible: !!showToggleEmbeds && document.embedsDisabled,
            },
            {
              title: t("Disable embeds"),
              onClick: document.disableEmbeds,
              visible: !!showToggleEmbeds && !document.embedsDisabled,
            },
            {
              type: "separator",
            },
            {
              title: t("New nested document"),
              to: newDocumentUrl(document.collectionId, {
                parentDocumentId: document.id,
              }),
              visible: !!can.createChildDocument,
            },
            {
              title: t("Import document"),
              visible: can.createChildDocument,
              onClick: handleImportDocument,
            },
            {
              title: `${t("Create template")}…`,
              onClick: () => setShowTemplateModal(true),
              visible: !!can.update && !document.isTemplate,
            },
            {
              title: t("Edit"),
              to: editDocumentUrl(document),
              visible: !!can.update,
            },
            {
              title: t("Duplicate"),
              onClick: handleDuplicate,
              visible: !!can.update,
            },
            {
              title: t("Unpublish"),
              onClick: handleUnpublish,
              visible: !!can.unpublish,
            },
            {
              title: t("Archive"),
              onClick: handleArchive,
              visible: !!can.archive,
            },
            {
              title: `${t("Delete")}…`,
              onClick: () => setShowDeleteModal(true),
              visible: !!can.delete,
            },
            {
              title: `${t("Move")}…`,
              onClick: () => setShowMoveModal(true),
              visible: !!can.move,
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
            },
            {
              title: t("Download"),
              onClick: document.download,
              visible: !!can.download,
            },
            {
              title: t("Print"),
              onClick: handlePrint,
              visible: !!showPrint,
            },
          ]}
        />
      </ContextMenu>
      {renderModals && (
        <>
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
          <Modal
            title={t("Create template")}
            onRequestClose={() => setShowTemplateModal(false)}
            isOpen={showTemplateModal}
          >
            <DocumentTemplatize
              document={document}
              onSubmit={() => setShowTemplateModal(false)}
            />
          </Modal>
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
