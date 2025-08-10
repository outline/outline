import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { observer } from "mobx-react";
import {
  ImportIcon,
  AlphabeticalSortIcon,
  AlphabeticalReverseSortIcon,
  ManualSortIcon,
  InputIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import { SubscriptionType } from "@shared/types";
import { getEventFiles } from "@shared/utils/files";
import Collection from "~/models/Collection";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import {
  ActionV2Separator,
  createActionV2,
  createActionV2WithChildren,
} from "~/actions";
import {
  deleteCollection,
  editCollection,
  editCollectionPermissions,
  starCollection,
  unstarCollection,
  searchInCollection,
  createTemplate,
  archiveCollection,
  restoreCollection,
  subscribeCollection,
  unsubscribeCollection,
  createDocument,
  exportCollection,
} from "~/actions/definitions/collections";
import useActionContext from "~/hooks/useActionContext";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { ActiveCollectionSection } from "~/actions/sections";
import { useMenuAction } from "~/hooks/useMenuAction";

type Props = {
  collection: Collection;
  align?: "start" | "end";
  neutral?: boolean;
  onRename?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
};

function CollectionMenu({
  collection,
  align,
  neutral,
  onRename,
  onOpen,
  onClose,
}: Props) {
  const { documents, subscriptions } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const file = React.useRef<HTMLInputElement>(null);

  const {
    loading: subscriptionLoading,
    loaded: subscriptionLoaded,
    request: loadSubscription,
  } = useRequest(() =>
    subscriptions.fetchOne({
      collectionId: collection.id,
      event: SubscriptionType.Document,
    })
  );

  const handlePointerEnter = React.useCallback(() => {
    if (!subscriptionLoading && !subscriptionLoaded) {
      void loadSubscription();
    }
  }, [subscriptionLoading, subscriptionLoaded, loadSubscription]);

  const stopPropagation = React.useCallback((ev: React.SyntheticEvent) => {
    ev.stopPropagation();
  }, []);

  const handleImportDocument = React.useCallback(() => {
    // simulate a click on the file upload input element
    if (file.current) {
      file.current.click();
    }
  }, [file]);

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
      } finally {
        ev.target.value = "";
      }
    },
    [history, collection.id, documents]
  );

  const handleChangeSort = React.useCallback(
    (field: string, direction = "asc") =>
      collection.save({
        sort: {
          field,
          direction,
        },
      }),
    [collection]
  );

  const can = usePolicy(collection);
  const context = useActionContext({
    isContextMenu: true,
    activeCollectionId: collection.id,
  });

  const sortAlphabetical = collection.sort.field === "title";
  const sortDir = collection.sort.direction;

  const sortAction = React.useMemo(
    () =>
      createActionV2WithChildren({
        name: t("Sort in sidebar"),
        section: ActiveCollectionSection,
        visible: can.update,
        icon: sortAlphabetical ? (
          sortDir === "asc" ? (
            <AlphabeticalSortIcon />
          ) : (
            <AlphabeticalReverseSortIcon />
          )
        ) : (
          <ManualSortIcon />
        ),
        children: [
          createActionV2({
            name: t("A-Z sort"),
            section: ActiveCollectionSection,
            visible: can.update,
            selected: sortAlphabetical && sortDir === "asc",
            perform: () => handleChangeSort("title", "asc"),
          }),
          createActionV2({
            name: t("Z-A sort"),
            section: ActiveCollectionSection,
            visible: can.update,
            selected: sortAlphabetical && sortDir === "desc",
            perform: () => handleChangeSort("title", "desc"),
          }),
          createActionV2({
            name: t("Manual sort"),
            section: ActiveCollectionSection,
            visible: can.update,
            selected: !sortAlphabetical,
            perform: () => handleChangeSort("index"),
          }),
        ],
      }),
    [t, can.update, sortAlphabetical, sortDir, handleChangeSort]
  );

  const actions = React.useMemo(
    () => [
      restoreCollection,
      starCollection,
      unstarCollection,
      subscribeCollection,
      unsubscribeCollection,
      ActionV2Separator,
      createDocument,
      createActionV2({
        name: t("Import document"),
        analyticsName: "Import document",
        section: ActiveCollectionSection,
        icon: <ImportIcon />,
        visible: can.createDocument,
        perform: handleImportDocument,
      }),
      ActionV2Separator,
      createActionV2({
        name: `${t("Rename")}…`,
        section: ActiveCollectionSection,
        icon: <InputIcon />,
        visible: !!can.update && !!onRename,
        perform: () => requestAnimationFrame(() => onRename?.()),
      }),
      editCollection,
      editCollectionPermissions,
      createTemplate,
      sortAction,
      exportCollection,
      archiveCollection,
      searchInCollection,
      ActionV2Separator,
      deleteCollection,
    ],
    [
      t,
      can.createDocument,
      can.update,
      sortAction,
      handleImportDocument,
      onRename,
    ]
  );

  const rootAction = useMenuAction(actions);

  return (
    <>
      <VisuallyHidden.Root>
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
      </VisuallyHidden.Root>
      <DropdownMenu
        action={rootAction}
        context={context}
        align={align}
        onOpen={onOpen}
        onClose={onClose}
        ariaLabel={t("Collection menu")}
      >
        <OverflowMenuButton
          neutral={neutral}
          onPointerEnter={handlePointerEnter}
        />
      </DropdownMenu>
    </>
  );
}

export default observer(CollectionMenu);
