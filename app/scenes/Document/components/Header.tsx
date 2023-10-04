import { observer } from "mobx-react";
import {
  TableOfContentsIcon,
  EditIcon,
  PlusIcon,
  MoonIcon,
  MoreIcon,
  SunIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import { NavigationNode } from "@shared/types";
import { Theme } from "~/stores/UiStore";
import Document from "~/models/Document";
import Revision from "~/models/Revision";
import { Action, Separator } from "~/components/Actions";
import Badge from "~/components/Badge";
import Button from "~/components/Button";
import Collaborators from "~/components/Collaborators";
import DocumentBreadcrumb from "~/components/DocumentBreadcrumb";
import { useEditingFocus } from "~/components/DocumentContext";
import Header from "~/components/Header";
import EmojiIcon from "~/components/Icons/EmojiIcon";
import Star from "~/components/Star";
import Tooltip from "~/components/Tooltip";
import { publishDocument } from "~/actions/definitions/documents";
import { navigateToTemplateSettings } from "~/actions/definitions/navigation";
import { restoreRevision } from "~/actions/definitions/revisions";
import useActionContext from "~/hooks/useActionContext";
import useMobile from "~/hooks/useMobile";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import NewChildDocumentMenu from "~/menus/NewChildDocumentMenu";
import TableOfContentsMenu from "~/menus/TableOfContentsMenu";
import TemplatesMenu from "~/menus/TemplatesMenu";
import { metaDisplay } from "~/utils/keyboard";
import { documentEditPath } from "~/utils/routeHelpers";
import ObservingBanner from "./ObservingBanner";
import PublicBreadcrumb from "./PublicBreadcrumb";
import ShareButton from "./ShareButton";

type Props = {
  document: Document;
  documentHasHeadings: boolean;
  revision: Revision | undefined;
  sharedTree: NavigationNode | undefined;
  shareId: string | null | undefined;
  isDraft: boolean;
  isEditing: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  publishingIsDisabled: boolean;
  savingIsDisabled: boolean;
  onSelectTemplate: (template: Document) => void;
  onSave: (options: {
    done?: boolean;
    publish?: boolean;
    autosave?: boolean;
  }) => void;
  headings: {
    title: string;
    level: number;
    id: string;
  }[];
};

function DocumentHeader({
  document,
  documentHasHeadings,
  revision,
  shareId,
  isEditing,
  isDraft,
  isPublishing,
  isSaving,
  savingIsDisabled,
  publishingIsDisabled,
  sharedTree,
  onSelectTemplate,
  onSave,
  headings,
}: Props) {
  const { t } = useTranslation();
  const { ui, auth } = useStores();
  const theme = useTheme();
  const { resolvedTheme } = ui;
  const { team, user } = auth;
  const isMobile = useMobile();
  const isRevision = !!revision;
  const isEditingFocus = useEditingFocus();

  // We cache this value for as long as the component is mounted so that if you
  // apply a template there is still the option to replace it until the user
  // navigates away from the doc
  const [isNew] = React.useState(document.isPersistedOnce);

  const handleSave = React.useCallback(() => {
    onSave({
      done: true,
    });
  }, [onSave]);

  const context = useActionContext({
    activeDocumentId: document?.id,
  });

  const { isDeleted, isTemplate } = document;
  const can = usePolicy(document?.id);
  const canToggleEmbeds = team?.documentEmbeds;
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
        borderOnHover
        neutral
      />
    </Tooltip>
  );
  const editAction = (
    <Action>
      <Tooltip
        tooltip={t("Edit {{noun}}", {
          noun: document.noun,
        })}
        shortcut="e"
        delay={500}
        placement="bottom"
      >
        <Button
          as={Link}
          icon={<EditIcon />}
          to={documentEditPath(document)}
          neutral
        >
          {isMobile ? null : t("Edit")}
        </Button>
      </Tooltip>
    </Action>
  );
  const appearanceAction = (
    <Action>
      <Tooltip
        tooltip={
          resolvedTheme === "light" ? t("Switch to dark") : t("Switch to light")
        }
        delay={500}
        placement="bottom"
      >
        <Button
          icon={resolvedTheme === "light" ? <SunIcon /> : <MoonIcon />}
          onClick={() =>
            ui.setTheme(resolvedTheme === "light" ? Theme.Dark : Theme.Light)
          }
          neutral
          borderOnHover
        />
      </Tooltip>
    </Action>
  );

  if (shareId) {
    return (
      <StyledHeader
        $hidden={isEditingFocus}
        title={document.title}
        hasSidebar={!!sharedTree}
        left={
          isMobile ? (
            <TableOfContentsMenu headings={headings} />
          ) : (
            <PublicBreadcrumb
              documentId={document.id}
              shareId={shareId}
              sharedTree={sharedTree}
            >
              {documentHasHeadings ? toc : null}
            </PublicBreadcrumb>
          )
        }
        actions={
          <>
            {appearanceAction}
            {can.update && !isEditing ? editAction : <div />}
          </>
        }
      />
    );
  }

  return (
    <>
      <StyledHeader
        $hidden={isEditingFocus}
        hasSidebar
        left={
          isMobile ? (
            <TableOfContentsMenu headings={headings} />
          ) : (
            <DocumentBreadcrumb document={document}>
              {toc} <Star document={document} color={theme.textSecondary} />
            </DocumentBreadcrumb>
          )
        }
        title={
          <>
            {document.emoji && (
              <>
                <EmojiIcon size={24} emoji={document.emoji} />{" "}
              </>
            )}
            {document.title}{" "}
            {document.isArchived && (
              <ArchivedBadge>{t("Archived")}</ArchivedBadge>
            )}
          </>
        }
        actions={
          <>
            <ObservingBanner />

            {!isPublishing && isSaving && user?.separateEditMode && (
              <Status>{t("Saving")}…</Status>
            )}
            {!isDeleted && !isRevision && <Collaborators document={document} />}
            {(isEditing || !user?.separateEditMode) && !isTemplate && isNew && (
              <Action>
                <TemplatesMenu
                  document={document}
                  onSelectTemplate={onSelectTemplate}
                />
              </Action>
            )}
            {!isEditing &&
              !isDeleted &&
              !isRevision &&
              !isTemplate &&
              !isMobile &&
              document.collectionId && (
                <Action>
                  <ShareButton document={document} />
                </Action>
              )}
            {(isEditing || isTemplate) && (
              <Action>
                <Tooltip
                  tooltip={t("Save")}
                  shortcut={`${metaDisplay}+enter`}
                  delay={500}
                  placement="bottom"
                >
                  <Button
                    context={context}
                    action={isTemplate ? navigateToTemplateSettings : undefined}
                    onClick={isTemplate ? undefined : handleSave}
                    disabled={savingIsDisabled}
                    neutral={isDraft}
                    hideIcon
                  >
                    {isDraft ? t("Save draft") : t("Done editing")}
                  </Button>
                </Tooltip>
              </Action>
            )}
            {can.update &&
              !isEditing &&
              user?.separateEditMode &&
              !isRevision &&
              editAction}
            {can.update &&
              can.createChildDocument &&
              !isRevision &&
              !isMobile && (
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
            {revision && revision.createdAt !== document.updatedAt && (
              <Action>
                <Tooltip
                  tooltip={t("Restore version")}
                  delay={500}
                  placement="bottom"
                >
                  <Button
                    action={restoreRevision}
                    context={context}
                    neutral
                    hideOnActionDisabled
                  >
                    {t("Restore")}
                  </Button>
                </Tooltip>
              </Action>
            )}
            <Action>
              <Button
                action={publishDocument}
                context={context}
                disabled={publishingIsDisabled}
                hideOnActionDisabled
                hideIcon
              >
                {document.collectionId ? t("Publish") : `${t("Publish")}…`}
              </Button>
            </Action>
            {!isDeleted && <Separator />}
            <Action>
              <DocumentMenu
                document={document}
                isRevision={isRevision}
                label={(props) => (
                  <Button
                    icon={<MoreIcon />}
                    {...props}
                    borderOnHover
                    neutral
                  />
                )}
                showToggleEmbeds={canToggleEmbeds}
                showDisplayOptions
              />
            </Action>
          </>
        }
      />
    </>
  );
}

const StyledHeader = styled(Header)<{ $hidden: boolean }>`
  transition: opacity 500ms ease-in-out;
  ${(props) => props.$hidden && "opacity: 0;"}
`;

const ArchivedBadge = styled(Badge)`
  position: absolute;
`;

const Status = styled(Action)`
  padding-left: 0;
  padding-right: 4px;
  color: ${(props) => props.theme.slate};
`;

export default observer(DocumentHeader);
