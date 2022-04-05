import { observer } from "mobx-react";
import {
  NewDocumentIcon,
  EditIcon,
  TrashIcon,
  ImportIcon,
  ExportIcon,
  PadlockIcon,
  AlphabeticalSortIcon,
  ManualSortIcon,
  UnstarredIcon,
  StarredIcon,
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
import usePolicy from "~/hooks/usePolicy";
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
  const { documents, dialogs } = useStores();
  const { showToast } = useToasts();
  const { t } = useTranslation();
  const history = useHistory();
  const file = React.useRef<HTMLInputElement>(null);
  const [
    showCollectionPermissions,
    setShowCollectionPermissions,
  ] = React.useState(false);
  const [showCollectionEdit, setShowCollectionEdit] = React.useState(false);
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

  const handleChangeSort = React.useCallback(
    (field: string) => {
      menu.hide();
      return collection.save({
        sort: {
          field,
          direction: "asc",
        },
      });
    },
    [collection, menu]
  );

  const handleDelete = React.useCallback(() => {
    dialogs.openModal({
      isCentered: true,
      title: t("Delete collection"),
      content: (
        <CollectionDelete
          collection={collection}
          onSubmit={dialogs.closeAllModals}
        />
      ),
    });
  }, [dialogs, t, collection]);

  const handleStar = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      collection.star();
    },
    [collection]
  );

  const handleUnstar = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      collection.unstar();
    },
    [collection]
  );

  const alphabeticalSort = collection.sort.field === "title";
  const can = usePolicy(collection.id);
  const canUserInTeam = usePolicy(team.id);
  const items: MenuItem[] = React.useMemo(
    () => [
      {
        type: "button",
        title: t("Unstar"),
        onClick: handleUnstar,
        visible: collection.isStarred && !!can.unstar,
        icon: <UnstarredIcon />,
      },
      {
        type: "button",
        title: t("Star"),
        onClick: handleStar,
        visible: !collection.isStarred && !!can.star,
        icon: <StarredIcon />,
      },
      {
        type: "separator",
      },
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
        type: "submenu",
        title: t("Sort in sidebar"),
        visible: can.update,
        icon: alphabeticalSort ? (
          <AlphabeticalSortIcon color="currentColor" />
        ) : (
          <ManualSortIcon color="currentColor" />
        ),
        items: [
          {
            type: "button",
            title: t("Alphabetical sort"),
            onClick: () => handleChangeSort("title"),
            selected: alphabeticalSort,
          },
          {
            type: "button",
            title: t("Manual sort"),
            onClick: () => handleChangeSort("index"),
            selected: !alphabeticalSort,
          },
        ],
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
        onClick: handleDelete,
        icon: <TrashIcon />,
      },
    ],
    [
      t,
      can.update,
      can.delete,
      can.star,
      can.unstar,
      handleStar,
      handleUnstar,
      alphabeticalSort,
      handleChangeSort,
      handleNewDocument,
      handleImportDocument,
      handleDelete,
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
