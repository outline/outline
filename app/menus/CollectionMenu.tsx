import { observer } from "mobx-react";
import {
  NewDocumentIcon,
  ImportIcon,
  ExportIcon,
  AlphabeticalSortIcon,
  ManualSortIcon,
  InputIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useMenuState, MenuButton, MenuButtonHTMLProps } from "reakit/Menu";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import { toast } from "sonner";
import { getEventFiles } from "@shared/utils/files";
import Collection from "~/models/Collection";
import ContextMenu, { Placement } from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import ExportDialog from "~/components/ExportDialog";
import { actionToMenuItem } from "~/actions";
import {
  deleteCollection,
  editCollection,
  editCollectionPermissions,
  starCollection,
  unstarCollection,
  searchInCollection,
  createTemplate,
} from "~/actions/definitions/collections";
import useActionContext from "~/hooks/useActionContext";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { MenuItem } from "~/types";
import { newDocumentPath } from "~/utils/routeHelpers";

type Props = {
  collection: Collection;
  placement?: Placement;
  modal?: boolean;
  label?: (props: MenuButtonHTMLProps) => React.ReactNode;
  onRename?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
};

function CollectionMenu({
  collection,
  label,
  modal = true,
  placement,
  onRename,
  onOpen,
  onClose,
}: Props) {
  const menu = useMenuState({
    modal,
    placement,
  });
  const team = useCurrentTeam();
  const { documents, dialogs } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const file = React.useRef<HTMLInputElement>(null);

  const handleExport = React.useCallback(() => {
    dialogs.openModal({
      title: t("Export collection"),
      content: (
        <ExportDialog
          collection={collection}
          onSubmit={dialogs.closeAllModals}
        />
      ),
    });
  }, [collection, dialogs, t]);

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
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const files = getEventFiles(ev);

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
        toast.error(err.message);
        throw err;
      }
    },
    [history, collection.id, documents]
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

  const context = useActionContext({
    isContextMenu: true,
    activeCollectionId: collection.id,
  });

  const alphabeticalSort = collection.sort.field === "title";
  const can = usePolicy(collection);
  const canUserInTeam = usePolicy(team);
  const items: MenuItem[] = React.useMemo(
    () => [
      actionToMenuItem(starCollection, context),
      actionToMenuItem(unstarCollection, context),
      {
        type: "separator",
      },
      {
        type: "button",
        title: t("New document"),
        visible: can.createDocument,
        onClick: handleNewDocument,
        icon: <NewDocumentIcon />,
      },
      {
        type: "button",
        title: t("Import document"),
        visible: can.createDocument,
        onClick: handleImportDocument,
        icon: <ImportIcon />,
      },
      {
        type: "separator",
      },
      {
        type: "button",
        title: `${t("Rename")}…`,
        visible: !!can.update && !!onRename,
        onClick: () => onRename?.(),
        icon: <InputIcon />,
      },
      actionToMenuItem(editCollection, context),
      actionToMenuItem(editCollectionPermissions, context),
      actionToMenuItem(createTemplate, context),
      {
        type: "submenu",
        title: t("Sort in sidebar"),
        visible: can.update,
        icon: alphabeticalSort ? <AlphabeticalSortIcon /> : <ManualSortIcon />,
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
        title: `${t("Export")}…`,
        visible: !!(collection && canUserInTeam.createExport && can.export),
        onClick: handleExport,
        icon: <ExportIcon />,
      },
      actionToMenuItem(searchInCollection, context),
      {
        type: "separator",
      },
      actionToMenuItem(deleteCollection, context),
    ],
    [
      t,
      collection,
      can.createDocument,
      can.update,
      can.export,
      handleNewDocument,
      handleImportDocument,
      context,
      alphabeticalSort,
      canUserInTeam.createExport,
      handleExport,
      handleChangeSort,
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
        onOpen={onOpen}
        onClose={onClose}
        aria-label={t("Collection")}
      >
        <Template {...menu} items={items} />
      </ContextMenu>
    </>
  );
}

export default observer(CollectionMenu);
