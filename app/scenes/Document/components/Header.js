// @flow
import { observer } from "mobx-react";
import {
  TableOfContentsIcon,
  EditIcon,
  GlobeIcon,
  PlusIcon,
  MoreIcon,
} from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Document from "models/Document";
import DocumentShare from "scenes/DocumentShare";
import { Action, Separator } from "components/Actions";
import Badge from "components/Badge";
import Breadcrumb, { Slash } from "components/Breadcrumb";
import Button from "components/Button";
import Collaborators from "components/Collaborators";
import Fade from "components/Fade";
import Header from "components/Header";
import Modal from "components/Modal";
import Tooltip from "components/Tooltip";
import useStores from "hooks/useStores";
import DocumentMenu from "menus/DocumentMenu";
import NewChildDocumentMenu from "menus/NewChildDocumentMenu";
import TemplatesMenu from "menus/TemplatesMenu";
import { metaDisplay } from "utils/keyboard";
import { newDocumentUrl, editDocumentUrl } from "utils/routeHelpers";

type Props = {|
  document: Document,
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
|};

function DocumentHeader({
  document,
  isEditing,
  isDraft,
  isPublishing,
  isRevision,
  isSaving,
  savingIsDisabled,
  publishingIsDisabled,
  onSave,
}: Props) {
  const { t } = useTranslation();
  const { auth, ui, shares, policies } = useStores();
  const [showShareModal, setShowShareModal] = React.useState(false);

  const handleSave = React.useCallback(() => {
    onSave({ done: true });
  }, [onSave]);

  const handlePublish = React.useCallback(() => {
    onSave({ done: true, publish: true });
  }, [onSave]);

  const handleShareLink = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      await document.share();

      setShowShareModal(true);
    },
    [document]
  );

  const handleCloseShareModal = React.useCallback(() => {
    setShowShareModal(false);
  }, []);

  const share = shares.getByDocumentId(document.id);
  const isPubliclyShared = share && share.published;
  const isNew = document.isNew;
  const isTemplate = document.isTemplate;
  const can = policies.abilities(document.id);
  const canShareDocument = auth.team && auth.team.sharing && can.share;
  const canToggleEmbeds = auth.team && auth.team.documentEmbeds;
  const canEdit = can.update && !isEditing;

  return (
    <>
      <Modal
        isOpen={showShareModal}
        onRequestClose={handleCloseShareModal}
        title={t("Share document")}
      >
        <DocumentShare document={document} onSubmit={handleCloseShareModal} />
      </Modal>
      <Header
        breadcrumb={
          <Breadcrumb document={document}>
            {!isEditing && (
              <>
                <Slash />
                <Tooltip
                  tooltip={
                    ui.tocVisible ? t("Hide contents") : t("Show contents")
                  }
                  shortcut={`ctrl+${metaDisplay}+h`}
                  delay={250}
                  placement="bottom"
                >
                  <Button
                    onClick={
                      ui.tocVisible
                        ? ui.hideTableOfContents
                        : ui.showTableOfContents
                    }
                    icon={<TableOfContentsIcon />}
                    iconColor="currentColor"
                    borderOnHover
                    neutral
                  />
                </Tooltip>
              </>
            )}
          </Breadcrumb>
        }
        title={
          <>
            {document.title}{" "}
            {document.isArchived && <Badge>{t("Archived")}</Badge>}
          </>
        }
        actions={
          <>
            {isSaving && !isPublishing && (
              <Action>
                <Status>{t("Saving")}…</Status>
              </Action>
            )}
            &nbsp;
            <Fade>
              <Collaborators
                document={document}
                currentUserId={auth.user ? auth.user.id : undefined}
              />
            </Fade>
            {isEditing && !isTemplate && isNew && (
              <Action>
                <TemplatesMenu document={document} />
              </Action>
            )}
            {!isEditing && canShareDocument && (
              <Action>
                <Tooltip
                  tooltip={
                    isPubliclyShared ? (
                      <Trans>
                        Anyone with the link <br />
                        can view this document
                      </Trans>
                    ) : (
                      ""
                    )
                  }
                  delay={500}
                  placement="bottom"
                >
                  <Button
                    icon={isPubliclyShared ? <GlobeIcon /> : undefined}
                    onClick={handleShareLink}
                    neutral
                  >
                    {t("Share")}
                  </Button>
                </Tooltip>
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
            {canEdit && (
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
            )}
            {canEdit && can.createChildDocument && (
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

const Status = styled.div`
  color: ${(props) => props.theme.slate};
`;

export default observer(DocumentHeader);
