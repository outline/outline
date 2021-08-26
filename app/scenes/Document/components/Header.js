// @flow
import { observer } from "mobx-react";
import {
  TableOfContentsIcon,
  EditIcon,
  PlusIcon,
  MoreIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useDialogState } from "reakit";
import styled from "styled-components";
import Document from "models/Document";
import { Action, Separator } from "components/Actions";
import Badge from "components/Badge";
import Button from "components/Button";
import Collaborators from "components/Collaborators";
import DocumentBreadcrumb from "components/DocumentBreadcrumb";
import Header from "components/Header";
import Tooltip from "components/Tooltip";
import PublicBreadcrumb from "./PublicBreadcrumb";
import PublishDialog from "./PublishDialog";
import ShareButton from "./ShareButton";
import useMobile from "hooks/useMobile";
import useStores from "hooks/useStores";
import DocumentMenu from "menus/DocumentMenu";
import NewChildDocumentMenu from "menus/NewChildDocumentMenu";
import TableOfContentsMenu from "menus/TableOfContentsMenu";
import TemplatesMenu from "menus/TemplatesMenu";
import { type NavigationNode } from "types";
import { metaDisplay } from "utils/keyboard";
import { newDocumentUrl, editDocumentUrl } from "utils/routeHelpers";

type Props = {|
  document: Document,
  sharedTree: ?NavigationNode,
  shareId: ?string,
  isDraft: boolean,
  isEditing: boolean,
  isRevision: boolean,
  isSaving: boolean,
  isPublishing: boolean,
  publishingIsDisabled: boolean,
  savingIsDisabled: boolean,
  onDiscard: () => void,
  onSave: ({
    done?: boolean,
    publish?: boolean,
    autosave?: boolean,
  }) => void,
  headings: { title: string, level: number, id: string }[],
|};

function DocumentHeader({
  document,
  shareId,
  isEditing,
  isDraft,
  isPublishing,
  isRevision,
  isSaving,
  savingIsDisabled,
  publishingIsDisabled,
  sharedTree,
  onSave,
  headings,
}: Props) {
  const { t } = useTranslation();
  const { auth, ui, policies, collections } = useStores();
  const isMobile = useMobile();
  const dialog = useDialogState({ modal: true });
  const hasCollection = !!collections.get(document.collectionId || "");

  const handleSave = React.useCallback(() => {
    onSave({ done: true });
  }, [onSave]);

  const handlePublish = React.useCallback(() => {
    if (!hasCollection) {
      dialog.setVisible(true);
      return;
    }
    onSave({ done: true, publish: true });
  }, [dialog, hasCollection, onSave]);

  const isNew = document.isNewDocument;
  const isTemplate = document.isTemplate;
  const can = policies.abilities(document.id);
  const canToggleEmbeds = auth.team && auth.team.documentEmbeds;
  const canEdit = can.update && !isEditing;

  const toc = (
    <Tooltip
      tooltip={ui.tocVisible ? t("Hide contents") : t("Show contents")}
      shortcut="ctrl+alt+h"
      delay={250}
      placement="bottom"
    >
      <Button
        onClick={
          ui.tocVisible ? ui.hideTableOfContents : ui.showTableOfContents
        }
        icon={<TableOfContentsIcon />}
        iconColor="currentColor"
        borderOnHover
        neutral
      />
    </Tooltip>
  );

  const editAction = (
    <Action>
      <Tooltip
        tooltip={t("Edit {{noun}}", { noun: document.noun })}
        shortcut="e"
        delay={500}
        placement="bottom"
      >
        <Button
          as={Link}
          icon={<EditIcon />}
          to={editDocumentUrl(document)}
          neutral
        >
          {t("Edit")}
        </Button>
      </Tooltip>
    </Action>
  );

  if (shareId) {
    return (
      <Header
        title={document.title}
        breadcrumb={
          <PublicBreadcrumb
            documentId={document.id}
            shareId={shareId}
            sharedTree={sharedTree}
          >
            {toc}
          </PublicBreadcrumb>
        }
        actions={canEdit ? editAction : <div />}
      />
    );
  }

  return (
    <>
      <Header
        breadcrumb={
          <DocumentBreadcrumb document={document}>
            {!isEditing && toc}
          </DocumentBreadcrumb>
        }
        title={
          <>
            {document.title}{" "}
            {document.isArchived && <Badge>{t("Archived")}</Badge>}
          </>
        }
        actions={
          <>
            {isMobile && (
              <TocWrapper>
                <TableOfContentsMenu headings={headings} />
              </TocWrapper>
            )}
            {!isPublishing && isSaving && <Status>{t("Saving")}…</Status>}
            <Collaborators
              document={document}
              currentUserId={auth.user ? auth.user.id : undefined}
            />
            {isEditing && !isTemplate && isNew && (
              <Action>
                <TemplatesMenu document={document} />
              </Action>
            )}
            {!isEditing && !isMobile && !isTemplate && hasCollection && (
              <Action>
                <ShareButton document={document} />
              </Action>
            )}
            {isEditing && (
              <>
                <Action>
                  <Tooltip
                    tooltip={t("Save")}
                    shortcut={`${metaDisplay}+enter`}
                    delay={500}
                    placement="bottom"
                  >
                    <Button
                      onClick={handleSave}
                      disabled={savingIsDisabled}
                      neutral={isDraft}
                    >
                      {isDraft ? t("Save Draft") : t("Done Editing")}
                    </Button>
                  </Tooltip>
                </Action>
              </>
            )}
            {canEdit && editAction}
            {canEdit && can.createChildDocument && !isMobile && (
              <Action>
                <NewChildDocumentMenu
                  document={document}
                  label={(props) => (
                    <Tooltip
                      tooltip={t("New document")}
                      shortcut="n"
                      delay={500}
                      placement="bottom"
                    >
                      <Button icon={<PlusIcon />} {...props} neutral>
                        {t("New doc")}
                      </Button>
                    </Tooltip>
                  )}
                />
              </Action>
            )}
            {canEdit && isTemplate && !isDraft && !isRevision && (
              <Action>
                <Button
                  icon={<PlusIcon />}
                  as={Link}
                  to={newDocumentUrl(document.collectionId, {
                    templateId: document.id,
                  })}
                  primary
                >
                  {t("New from template")}
                </Button>
              </Action>
            )}
            {can.update && isDraft && !isRevision && !hasCollection && (
              <PublishDialog
                dialog={dialog}
                document={document}
                onSave={onSave}
              />
            )}
            {can.update && isDraft && !isRevision && (
              <Action>
                <Tooltip
                  tooltip={t("Publish")}
                  shortcut={`${metaDisplay}+shift+p`}
                  delay={500}
                  placement="bottom"
                >
                  <Button
                    onClick={handlePublish}
                    disabled={publishingIsDisabled}
                  >
                    {isPublishing ? `${t("Publishing")}…` : t("Publish")}
                  </Button>
                </Tooltip>
              </Action>
            )}
            {!isEditing && (
              <>
                <Separator />
                <Action>
                  <DocumentMenu
                    document={document}
                    isRevision={isRevision}
                    label={(props) => (
                      <Button
                        icon={<MoreIcon />}
                        iconColor="currentColor"
                        {...props}
                        borderOnHover
                        neutral
                      />
                    )}
                    showToggleEmbeds={canToggleEmbeds}
                    showPrint
                  />
                </Action>
              </>
            )}
          </>
        }
      />
    </>
  );
}

const Status = styled(Action)`
  padding-left: 0;
  padding-right: 4px;
  color: ${(props) => props.theme.slate};
`;

const TocWrapper = styled(Action)`
  position: absolute;
  left: 42px;
`;

export default observer(DocumentHeader);
