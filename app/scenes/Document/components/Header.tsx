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
import Icon from "@shared/components/Icon";
import { useComponentSize } from "@shared/hooks/useComponentSize";
import { NavigationNode } from "@shared/types";
import { altDisplay, metaDisplay } from "@shared/utils/keyboard";
import { Theme } from "~/stores/UiStore";
import Document from "~/models/Document";
import Revision from "~/models/Revision";
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
import useActionContext from "~/hooks/useActionContext";
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

type Props = {
  document: Document;
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
};

function DocumentHeader({
  document,
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
}: Props) {
  const { t } = useTranslation();
  const { ui } = useStores();
  const theme = useTheme();
  const team = useCurrentTeam({ rejectOnEmpty: false });
  const user = useCurrentUser({ rejectOnEmpty: false });
  const { resolvedTheme } = ui;
  const isMobileMedia = useMobile();
  const isRevision = !!revision;
  const isEditingFocus = useEditingFocus();
  const { hasHeadings, editor } = useDocumentContext();
  const sidebarContext = useLocationSidebarContext();
  const ref = React.useRef<HTMLDivElement | null>(null);
  const size = useComponentSize(ref);
  const isMobile = isMobileMedia || size.width < 700;
  const isShare = !!shareId;

  // We cache this value for as long as the component is mounted so that if you
  // apply a template there is still the option to replace it until the user
  // navigates away from the doc
  const [isNew] = React.useState(document.isPersistedOnce);

  const handleSave = React.useCallback(() => {
    onSave({
      done: true,
    });
  }, [onSave]);

  const handleToggle = React.useCallback(() => {
    // Public shares, by default, show ToC on load.
    if (isShare && ui.tocVisible === undefined) {
      ui.set({ tocVisible: false });
    } else {
      ui.set({ tocVisible: !ui.tocVisible });
    }
  }, [ui, isShare]);

  const context = useActionContext({
    activeDocumentId: document?.id,
  });

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
  const appearanceAction = (
    <Action>
      <Tooltip
        content={
          resolvedTheme === "light" ? t("Switch to dark") : t("Switch to light")
        }
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

  useKeyDown(
    (event) => event.ctrlKey && event.altKey && event.key === "˙",
    handleToggle,
    {
      allowInInput: true,
    }
  );

  if (shareId) {
    return (
      <StyledHeader
        ref={ref}
        $hidden={isEditingFocus}
        title={
          <Flex gap={4}>
            {document.icon && (
              <Icon value={document.icon} color={document.color ?? undefined} />
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
        ref={ref}
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
              <Icon value={document.icon} color={document.color ?? undefined} />
            )}
            {document.title}
            {document.isArchived && <Badge>{t("Archived")}</Badge>}
          </Flex>
        }
        actions={({ isCompact }) => (
          <>
            <ObservingBanner />

            {!isPublishing && isSaving && user?.separateEditMode && (
              <Status>{t("Saving")}…</Status>
            )}
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
                  content={t("Save")}
                  shortcut={`${metaDisplay}+enter`}
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
              !isCompact &&
              !isMobile && (
                <Action>
                  <NewChildDocumentMenu
                    document={document}
                    label={(props) => (
                      <Tooltip
                        content={t("New document")}
                        shortcut="n"
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
                <Tooltip content={t("Restore version")} placement="bottom">
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
            {can.publish && (
              <Action>
                <Button
                  action={publishDocument}
                  context={context}
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
                isRevision={isRevision}
                label={(props) => (
                  <Button
                    icon={<MoreIcon />}
                    {...props}
                    borderOnHover
                    neutral
                  />
                )}
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

const Status = styled(Action)`
  padding-left: 0;
  padding-right: 4px;
  color: ${(props) => props.theme.slate};
`;

export default observer(DocumentHeader);
