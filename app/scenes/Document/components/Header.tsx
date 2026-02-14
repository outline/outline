import { observer } from "mobx-react";
import { TableOfContentsIcon, EditIcon } from "outline-icons";
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import Icon from "@shared/components/Icon";
import useMeasure from "react-use-measure";
import { altDisplay, metaDisplay } from "@shared/utils/keyboard";
import type Document from "~/models/Document";
import type Revision from "~/models/Revision";
import { Action, Separator } from "~/components/Actions";
import Badge from "~/components/Badge";
import Button from "~/components/Button";
import Collaborators from "~/components/Collaborators";
import DocumentBreadcrumb from "~/components/DocumentBreadcrumb";
import { useDocumentContext } from "~/components/DocumentContext";
import Flex from "~/components/Flex";
import Header from "~/components/Header";
import Star from "~/components/Star";
import Tooltip from "~/components/Tooltip";
import { publishDocument } from "~/actions/definitions/documents";
import { navigateToTemplateSettings } from "~/actions/definitions/navigation";
import { restoreRevision } from "~/actions/definitions/revisions";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import useEditingFocus from "~/hooks/useEditingFocus";
import useKeyDown from "~/hooks/useKeyDown";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useMobile from "~/hooks/useMobile";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import NewChildDocumentMenu from "~/menus/NewChildDocumentMenu";
import TableOfContentsMenu from "~/menus/TableOfContentsMenu";
import TemplatesMenu from "~/menus/TemplatesMenu";
import { documentEditPath } from "~/utils/routeHelpers";
import ObservingBanner from "./ObservingBanner";
import PublicBreadcrumb from "./PublicBreadcrumb";
import ShareButton from "./ShareButton";
import { AppearanceAction } from "~/components/Sharing/components/Actions";
import useShare from "@shared/hooks/useShare";
import { type Editor } from "~/editor";
import { ChangesNavigation } from "./ChangesNavigation";

type Props = {
  editorRef: React.RefObject<Editor>;
  document: Document;
  revision: Revision | undefined;
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
};

function DocumentHeader({
  editorRef,
  document,
  revision,
  isEditing,
  isDraft,
  savingIsDisabled,
  publishingIsDisabled,
  onSelectTemplate,
  onSave,
}: Props) {
  const { t } = useTranslation();
  const { ui } = useStores();
  const theme = useTheme();
  const team = useCurrentTeam({ rejectOnEmpty: false });
  const user = useCurrentUser({ rejectOnEmpty: false });
  const isMobileMedia = useMobile();
  const isRevision = !!revision;
  const isEditingFocus = useEditingFocus();

  // Set CSS variable for header offset (used by sticky table headers)
  useEffect(() => {
    window.document.documentElement.style.setProperty(
      "--header-offset",
      isEditingFocus ? "0px" : "64px"
    );
  }, [isEditingFocus]);

  const { hasHeadings, editor } = useDocumentContext();
  const sidebarContext = useLocationSidebarContext();
  const [measureRef, size] = useMeasure();
  const { isShare, shareId, sharedTree } = useShare();
  const isMobile = isMobileMedia || size.width < 700;

  // We cache this value for as long as the component is mounted so that if you
  // apply a template there is still the option to replace it until the user
  // navigates away from the doc
  const [isNew] = useState(document.isPersistedOnce);

  const handleSave = useCallback(() => {
    onSave({
      done: true,
    });
  }, [onSave]);

  const handleToggle = useCallback(() => {
    // Public shares, by default, show ToC on load.
    if (isShare && ui.tocVisible === undefined) {
      ui.set({ tocVisible: false });
    } else {
      ui.set({ tocVisible: !ui.tocVisible });
    }
  }, [ui, isShare]);

  const can = usePolicy(document);
  const { isDeleted, isTemplate } = document;
  const isTemplateEditable = can.update && isTemplate;
  const canToggleEmbeds = team?.documentEmbeds;
  const showContents =
    (ui.tocVisible === true && !document.isTemplate) ||
    (isShare && ui.tocVisible !== false);

  const toc = (
    <Tooltip
      content={
        showContents
          ? t("Hide contents")
          : hasHeadings
            ? t("Show contents")
            : `${t("Show contents")} (${t("available when headings are added")})`
      }
      shortcut={`Ctrl+${altDisplay}+h`}
      placement="bottom"
    >
      <Button
        aria-label={t("Show contents")}
        onClick={handleToggle}
        icon={<TableOfContentsIcon />}
        borderOnHover
        neutral
      />
    </Tooltip>
  );
  const editAction = (
    <Action>
      <Tooltip
        content={t("Edit {{noun}}", {
          noun: document.noun,
        })}
        shortcut="e"
        placement="bottom"
      >
        <Button
          as={Link}
          icon={<EditIcon />}
          to={{
            pathname: documentEditPath(document),
            state: { sidebarContext },
          }}
          neutral
        >
          {isMobile ? null : t("Edit")}
        </Button>
      </Tooltip>
    </Action>
  );

  useKeyDown(
    (event) => event.ctrlKey && event.altKey && event.code === "KeyH",
    handleToggle,
    {
      allowInInput: true,
    }
  );

  if (shareId) {
    return (
      <StyledHeader
        ref={measureRef}
        $hidden={isEditingFocus}
        title={
          <Flex gap={4}>
            {document.icon && (
              <Icon
                value={document.icon}
                initial={document.initial}
                color={document.color ?? undefined}
              />
            )}
            {document.title}
          </Flex>
        }
        hasSidebar={sharedTree && sharedTree.children?.length > 0}
        left={
          isMobile ? (
            hasHeadings ? (
              <TableOfContentsMenu />
            ) : null
          ) : (
            <PublicBreadcrumb
              documentId={document.id}
              shareId={shareId}
              sharedTree={sharedTree}
            >
              {hasHeadings ? toc : null}
            </PublicBreadcrumb>
          )
        }
        actions={
          <>
            <AppearanceAction />
            {can.update && !isEditing ? editAction : <div />}
          </>
        }
      />
    );
  }

  return (
    <>
      <StyledHeader
        ref={measureRef}
        $hidden={isEditingFocus}
        hasSidebar
        left={
          isMobile ? (
            <TableOfContentsMenu />
          ) : (
            <DocumentBreadcrumb document={document}>
              {document.isTemplate ? null : (
                <>
                  {toc} <Star document={document} color={theme.textSecondary} />
                </>
              )}
            </DocumentBreadcrumb>
          )
        }
        title={
          <Flex gap={4} align="center">
            {document.icon && (
              <Icon
                value={document.icon}
                initial={document.initial}
                color={document.color ?? undefined}
              />
            )}
            {document.title}
            {document.isArchived && <Badge>{t("Archived")}</Badge>}
          </Flex>
        }
        actions={({ isCompact }) => (
          <>
            <ObservingBanner />
            {!isDeleted && !isRevision && can.listViews && (
              <Collaborators
                document={document}
                limit={isCompact ? 3 : undefined}
              />
            )}
            {(isEditing || !user?.separateEditMode) &&
              !isTemplate &&
              isNew &&
              can.update && (
                <Action>
                  <TemplatesMenu
                    isCompact={isCompact}
                    document={document}
                    onSelectTemplate={onSelectTemplate}
                  />
                </Action>
              )}
            {!isEditing && !isRevision && !isTemplate && can.update && (
              <Action>
                <ShareButton document={document} />
              </Action>
            )}
            {(isEditing || isTemplateEditable) && (
              <Action>
                <Tooltip
                  content={isDraft ? t("Save draft") : t("Done editing")}
                  shortcut={`${metaDisplay}+enter`}
                  placement="bottom"
                >
                  <Button
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
              !isCompact &&
              !isMobile && (
                <Action>
                  <NewChildDocumentMenu document={document} />
                </Action>
              )}
            {revision && (
              <>
                <Action>
                  <ChangesNavigation
                    revision={revision}
                    editorRef={editorRef}
                  />
                </Action>
                <Action>
                  <Tooltip content={t("Restore version")} placement="bottom">
                    <Button
                      action={restoreRevision}
                      disabled={revision.createdAt === document.updatedAt}
                      neutral
                      hideOnActionDisabled
                    >
                      {t("Restore")}
                    </Button>
                  </Tooltip>
                </Action>
              </>
            )}
            {can.publish && (
              <Action>
                <Button
                  action={publishDocument}
                  disabled={publishingIsDisabled}
                  hideOnActionDisabled
                  hideIcon
                >
                  {document.collectionId || document.isWorkspaceTemplate
                    ? t("Publish")
                    : `${t("Publish")}…`}
                </Button>
              </Action>
            )}
            {!isDeleted && <Separator />}
            <Action>
              <DocumentMenu
                document={document}
                align="end"
                neutral
                onSelectTemplate={onSelectTemplate}
                onFindAndReplace={editor?.commands.openFindAndReplace}
                showToggleEmbeds={canToggleEmbeds}
                showDisplayOptions
              />
            </Action>
          </>
        )}
      />
    </>
  );
}

const StyledHeader = styled(Header)<{ $hidden: boolean }>`
  transition: opacity 500ms ease-in-out;
  ${(props) => props.$hidden && "opacity: 0;"}
`;

export default observer(DocumentHeader);
