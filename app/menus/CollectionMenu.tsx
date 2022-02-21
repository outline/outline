import { observer } from "mobx-react";
import {
  NewDocumentIcon,
  EditIcon,
  TrashIcon,
  ImportIcon,
  ExportIcon,
  PadlockIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useMenuState, MenuButton } from "reakit/Menu";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import getDataTransferFiles from "@shared/utils/getDataTransferFiles";
import Collection from "~/models/Collection";
import CollectionDelete from "~/scenes/CollectionDelete";
import CollectionEdit from "~/scenes/CollectionEdit";
import CollectionExport from "~/scenes/CollectionExport";
import CollectionPermissions from "~/scenes/CollectionPermissions";
import ContextMenu, { Placement } from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import Modal from "~/components/Modal";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import { MenuItem } from "~/types";
import { newDocumentPath } from "~/utils/routeHelpers";

type Props = {
  collection: Collection;
  placement?: Placement;
  modal?: boolean;
  label?: (arg0: any) => React.ReactNode;
  onOpen?: () => void;
  onClose?: () => void;
};

function CollectionMenu({
  collection,
  label,
  modal = true,
  placement,
  onOpen,
  onClose,
}: Props) {
  const menu = useMenuState({
    modal,
    placement,
  });
  const [renderModals, setRenderModals] = React.useState(false);
  const team = useCurrentTeam();
  const { documents, policies } = useStores();
  const { showToast } = useToasts();
  const { t } = useTranslation();
  const history = useHistory();
  const file = React.useRef<HTMLInputElement>(null);
  const [
    showCollectionPermissions,
    setShowCollectionPermissions,
  ] = React.useState(false);
  const [showCollectionEdit, setShowCollectionEdit] = React.useState(false);
  const [showCollectionDelete, setShowCollectionDelete] = React.useState(false);
  const [showCollectionExport, setShowCollectionExport] = React.useState(false);

  const handleOpen = React.useCallback(() => {
    setRenderModals(true);

    if (onOpen) {
      onOpen();
    }
  }, [onOpen]);

  const handleNewDocument = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      history.push(newDocumentPath(collection.id));
    },
    [history, collection.id]
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

      try {
        const file = files[0];
        const document = await documents.import(file, null, collection.id, {
          publish: true,
        });
        history.push(document.url);
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
        throw err;
      }
    },
    [history, showToast, collection.id, documents]
  );

  const can = policies.abilities(collection.id);
  const canUserInTeam = policies.abilities(team.id);
  const items: MenuItem[] = React.useMemo(
    () => [
      {
        type: "button",
        title: t("New document"),
        visible: can.update,
        onClick: handleNewDocument,
        icon: <NewDocumentIcon />,
      },
      {
        type: "button",
        title: t("Import document"),
        visible: can.update,
        onClick: handleImportDocument,
        icon: <ImportIcon />,
      },
      {
        type: "separator",
      },
      {
        type: "button",
        title: `${t("Edit")}…`,
        visible: can.update,
        onClick: () => setShowCollectionEdit(true),
        icon: <EditIcon />,
      },
      {
        type: "button",
        title: `${t("Permissions")}…`,
        visible: can.update,
        onClick: () => setShowCollectionPermissions(true),
        icon: <PadlockIcon />,
      },
      {
        type: "button",
        title: `${t("Export")}…`,
        visible: !!(collection && canUserInTeam.export),
        onClick: () => setShowCollectionExport(true),
        icon: <ExportIcon />,
      },
      {
        type: "separator",
      },
      {
        type: "button",
        title: `${t("Delete")}…`,
        dangerous: true,
        visible: !!(collection && can.delete),
        onClick: () => setShowCollectionDelete(true),
        icon: <TrashIcon />,
      },
    ],
    [
      t,
      can.update,
      can.delete,
      handleNewDocument,
      handleImportDocument,
      collection,
      canUserInTeam.export,
    ]
  );

  if (!items.length) {
    return null;
  }

  return (
    <>
      <VisuallyHidden>
        <input
          type="file"
          ref={file}
          onChange={handleFilePicked}
          onClick={stopPropagation}
          accept={documents.importFileTypes.join(", ")}
          tabIndex={-1}
        />
      </VisuallyHidden>
      {label ? (
        <MenuButton {...menu}>{label}</MenuButton>
      ) : (
        <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      )}
      <ContextMenu
        {...menu}
        onOpen={handleOpen}
        onClose={onClose}
        aria-label={t("Collection")}
      >
        <Template {...menu} items={items} />
      </ContextMenu>
      {renderModals && (
        <>
          <Modal
            title={t("Collection permissions")}
            onRequestClose={() => setShowCollectionPermissions(false)}
            isOpen={showCollectionPermissions}
          >
            <CollectionPermissions collection={collection} />
          </Modal>
          <Modal
            title={t("Edit collection")}
            isOpen={showCollectionEdit}
            onRequestClose={() => setShowCollectionEdit(false)}
          >
            <CollectionEdit
              onSubmit={() => setShowCollectionEdit(false)}
              collectionId={collection.id}
            />
          </Modal>
          <Modal
            title={t("Delete collection")}
            isOpen={showCollectionDelete}
            onRequestClose={() => setShowCollectionDelete(false)}
          >
            <CollectionDelete
              onSubmit={() => setShowCollectionDelete(false)}
              collection={collection}
            />
          </Modal>
          <Modal
            title={t("Export collection")}
            isOpen={showCollectionExport}
            onRequestClose={() => setShowCollectionExport(false)}
          >
            <CollectionExport
              onSubmit={() => setShowCollectionExport(false)}
              collection={collection}
            />
          </Modal>
        </>
      )}
    </>
  );
}

export default observer(CollectionMenu);
