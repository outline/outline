import { observer } from "mobx-react";
import { EditIcon, NewDocumentIcon, RestoreIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useMenuState, MenuButton, MenuButtonHTMLProps } from "reakit/Menu";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s, ellipsis } from "@shared/styles";
import { getEventFiles } from "@shared/utils/files";
import Document from "~/models/Document";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Separator from "~/components/ContextMenu/Separator";
import Template from "~/components/ContextMenu/Template";
import Flex from "~/components/Flex";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import Switch from "~/components/Switch";
import { actionToMenuItem } from "~/actions";
import {
  pinDocument,
  createTemplate,
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
} from "~/actions/definitions/documents";
import useActionContext from "~/hooks/useActionContext";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useMobile from "~/hooks/useMobile";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import { MenuItem } from "~/types";
import { documentEditPath, newDocumentPath } from "~/utils/routeHelpers";

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
  className,
  modal = true,
  showToggleEmbeds,
  showDisplayOptions,
  label,
  onOpen,
  onClose,
}: Props) {
  const team = useCurrentTeam();
  const { policies, collections, documents, subscriptions } = useStores();
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
  const file = React.useRef<HTMLInputElement>(null);
  const { data, loading, request } = useRequest(() =>
    subscriptions.fetchPage({
      documentId: document.id,
      event: "documents.update",
    })
  );

  const handleOpen = React.useCallback(async () => {
    if (!data && !loading) {
      request();
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
      showToast(t("Document restored"), {
        type: "success",
      });
    },
    [showToast, t, document]
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
            actionToMenuItem(starDocument, context),
            actionToMenuItem(unstarDocument, context),
            actionToMenuItem(subscribeDocument, context),
            actionToMenuItem(unsubscribeDocument, context),
            {
              type: "separator",
            },
            {
              type: "route",
              title: t("Edit"),
              to: documentEditPath(document),
              visible: !!can.update && !team.seamlessEditing,
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
            actionToMenuItem(importDocument, context),
            actionToMenuItem(createTemplate, context),
            actionToMenuItem(duplicateDocument, context),
            actionToMenuItem(publishDocument, context),
            actionToMenuItem(unpublishDocument, context),
            actionToMenuItem(archiveDocument, context),
            actionToMenuItem(moveDocument, context),
            actionToMenuItem(pinDocument, context),
            {
              type: "separator",
            },
            actionToMenuItem(openDocumentComments, context),
            actionToMenuItem(openDocumentHistory, context),
            actionToMenuItem(openDocumentInsights, context),
            actionToMenuItem(downloadDocument, context),
            actionToMenuItem(printDocument, context),
            {
              type: "separator",
            },
            actionToMenuItem(deleteDocument, context),
            actionToMenuItem(permanentlyDeleteDocument, context),
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
    </>
  );
}

const ToggleMenuItem = styled(Switch)`
  * {
    font-weight: normal;
    color: ${s("textSecondary")};
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
  ${ellipsis()}
`;

export default observer(DocumentMenu);
