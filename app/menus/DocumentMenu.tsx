import capitalize from "lodash/capitalize";
import { observer } from "mobx-react";
import { EditIcon, InputIcon, RestoreIcon, SearchIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useMenuState, MenuButton, MenuButtonHTMLProps } from "reakit/Menu";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import { toast } from "sonner";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import { UserPreference } from "@shared/types";
import { getEventFiles } from "@shared/utils/files";
import Document from "~/models/Document";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Separator from "~/components/ContextMenu/Separator";
import Template from "~/components/ContextMenu/Template";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import Switch from "~/components/Switch";
import { actionToMenuItem } from "~/actions";
import {
  pinDocument,
  createTemplateFromDocument,
  subscribeDocument,
  unsubscribeDocument,
  moveDocument,
  deleteDocument,
  permanentlyDeleteDocument,
  downloadDocument,
  importDocument,
  starDocument,
  unstarDocument,
  duplicateDocument,
  archiveDocument,
  openDocumentHistory,
  openDocumentInsights,
  publishDocument,
  unpublishDocument,
  printDocument,
  openDocumentComments,
  createDocumentFromTemplate,
  createNestedDocument,
  shareDocument,
  copyDocument,
  searchInDocument,
  moveTemplate,
} from "~/actions/definitions/documents";
import useActionContext from "~/hooks/useActionContext";
import useCurrentUser from "~/hooks/useCurrentUser";
import useMobile from "~/hooks/useMobile";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { MenuItem } from "~/types";
import { documentEditPath } from "~/utils/routeHelpers";

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
  onFindAndReplace?: () => void;
  onRename?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
};

function DocumentMenu({
  document,
  className,
  modal = true,
  showToggleEmbeds,
  showDisplayOptions,
  label,
  onFindAndReplace,
  onRename,
  onOpen,
  onClose,
}: Props) {
  const user = useCurrentUser();
  const { policies, collections, documents, subscriptions } = useStores();
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
    activeCollectionId: document.collectionId ?? undefined,
  });
  const { t } = useTranslation();
  const isMobile = useMobile();
  const file = React.useRef<HTMLInputElement>(null);
  const { data, loading, request } = useRequest(() =>
    subscriptions.fetchPage({
      documentId: document.id,
      event: "documents.update",
    })
  );

  const handleOpen = React.useCallback(async () => {
    if (!data && !loading) {
      await request();
    }

    if (onOpen) {
      onOpen();
    }
  }, [data, loading, onOpen, request]);

  const handleRestore = React.useCallback(
    async (
      ev: React.SyntheticEvent,
      options?: {
        collectionId: string;
      }
    ) => {
      await document.restore(options);
      toast.success(
        t("{{ documentName }} restored", {
          documentName: capitalize(document.noun),
        })
      );
    },
    [t, document]
  );

  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const can = usePolicy(document);
  const restoreItems = React.useMemo(
    () => [
      ...collections.orderedData.reduce<MenuItem[]>((filtered, collection) => {
        const can = policies.abilities(collection.id);

        if (can.createDocument) {
          filtered.push({
            type: "button",
            onClick: (ev) =>
              handleRestore(ev, {
                collectionId: collection.id,
              }),
            icon: <CollectionIcon collection={collection} />,
            title: collection.name,
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

  const handleFilePicked = React.useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const files = getEventFiles(ev);

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
        toast.error(err.message);
        throw err;
      }
    },
    [history, collection, documents, document.id]
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
              visible:
                ((document.isWorkspaceTemplate || !!collection) &&
                  can.restore) ||
                can.unarchive,
              onClick: (ev) => handleRestore(ev),
              icon: <RestoreIcon />,
            },
            {
              type: "submenu",
              title: t("Restore"),
              visible:
                !document.isWorkspaceTemplate &&
                !collection &&
                !!can.restore &&
                restoreItems.length !== 0,
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
            actionToMenuItem(starDocument, context),
            actionToMenuItem(unstarDocument, context),
            actionToMenuItem(subscribeDocument, context),
            actionToMenuItem(unsubscribeDocument, context),
            ...(isMobile ? [actionToMenuItem(shareDocument, context)] : []),
            {
              type: "button",
              title: `${t("Find and replace")}…`,
              visible: !!onFindAndReplace && isMobile,
              onClick: () => onFindAndReplace?.(),
              icon: <SearchIcon />,
            },
            {
              type: "separator",
            },
            {
              type: "route",
              title: t("Edit"),
              to: documentEditPath(document),
              visible:
                !!can.update && user.separateEditMode && !document.template,
              icon: <EditIcon />,
            },
            {
              type: "button",
              title: `${t("Rename")}…`,
              visible: !!can.update && !user.separateEditMode && !!onRename,
              onClick: () => onRename?.(),
              icon: <InputIcon />,
            },
            actionToMenuItem(createNestedDocument, context),
            actionToMenuItem(importDocument, context),
            actionToMenuItem(createTemplateFromDocument, context),
            actionToMenuItem(duplicateDocument, context),
            actionToMenuItem(publishDocument, context),
            actionToMenuItem(unpublishDocument, context),
            actionToMenuItem(archiveDocument, context),
            actionToMenuItem(moveDocument, context),
            actionToMenuItem(moveTemplate, context),
            actionToMenuItem(pinDocument, context),
            actionToMenuItem(createDocumentFromTemplate, context),
            {
              type: "separator",
            },
            actionToMenuItem(openDocumentComments, context),
            actionToMenuItem(openDocumentHistory, context),
            actionToMenuItem(openDocumentInsights, context),
            actionToMenuItem(downloadDocument, context),
            actionToMenuItem(copyDocument, context),
            actionToMenuItem(printDocument, context),
            actionToMenuItem(searchInDocument, context),
            {
              type: "separator",
            },
            actionToMenuItem(deleteDocument, context),
            actionToMenuItem(permanentlyDeleteDocument, context),
          ]}
        />
        {(showDisplayOptions || showToggleEmbeds) && can.update && (
          <>
            <Separator />
            <DisplayOptions>
              {showToggleEmbeds && (
                <Style>
                  <ToggleMenuItem
                    width={26}
                    height={14}
                    label={t("Enable embeds")}
                    labelPosition="left"
                    checked={!document.embedsDisabled}
                    onChange={
                      document.embedsDisabled
                        ? document.enableEmbeds
                        : document.disableEmbeds
                    }
                  />
                </Style>
              )}
              {showDisplayOptions && !isMobile && (
                <Style>
                  <ToggleMenuItem
                    width={26}
                    height={14}
                    label={t("Full width")}
                    labelPosition="left"
                    checked={document.fullWidth}
                    onChange={(ev) => {
                      const fullWidth = ev.currentTarget.checked;
                      user.setPreference(
                        UserPreference.FullWidthDocuments,
                        fullWidth
                      );
                      void user.save();
                      document.fullWidth = fullWidth;
                      void document.save();
                    }}
                  />
                </Style>
              )}
            </DisplayOptions>
          </>
        )}
      </ContextMenu>
    </>
  );
}

const ToggleMenuItem = styled(Switch)`
  * {
    font-weight: normal;
    color: ${s("textSecondary")};
  }
`;

const DisplayOptions = styled.div`
  padding: 8px 0 0;
`;

const Style = styled.div`
  padding: 12px;

  ${breakpoint("tablet")`
    padding: 4px 12px;
    font-size: 14px;
  `};
`;

export default observer(DocumentMenu);
