import type { Location, LocationDescriptor } from "history";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import type { ConnectDragSource } from "react-dnd";
import { useTranslation } from "react-i18next";
import type { match } from "react-router";
import styled from "styled-components";
import { DocumentValidation } from "@shared/validations";
import type Document from "~/models/Document";
import EditableTitle, { type RefHandle } from "~/components/EditableTitle";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useBoolean from "~/hooks/useBoolean";
import { ActionContextProvider } from "~/hooks/useActionContext";
import DropToImport from "./DropToImport";
import Relative from "./Relative";
import SidebarLink from "./SidebarLink";
import type { SidebarContextType } from "./SidebarContext";
import { useSidebarContext } from "./SidebarContext";
import type { ActionWithChildren } from "~/types";

export type DocumentRowProps = {
  /** Document identifier for policy, prefetch and import. */
  documentId: string;
  /** Loaded document; used for editing title and active matching. */
  document?: Document;

  /** Navigation target for the row. */
  to: LocationDescriptor;

  /** Indentation depth of the row. */
  depth: number;
  /** Applies draft styling around the row. */
  isDraft?: boolean;
  /** Scroll this row into view when it becomes the active route. */
  scrollIntoViewIfNeeded?: boolean;

  /** Icon displayed to the left of the label. */
  icon?: React.ReactNode;
  /** Displays a small unread badge to the right of the label. */
  unreadBadge?: boolean;

  /** Whether inline title updates are allowed. */
  canEdit?: boolean;
  /** Static label content; when provided, it is rendered in preference to `labelText`. */
  label?: React.ReactNode;
  /** Label as a text string, for editing. */
  labelText?: string;
  /** Submit handler when title updates are allowed. */
  onTitleChange?: (value: string) => Promise<void>;
  /** Forwarded ref to the `EditableTitle` instance when it is rendered. */
  editableTitleRef?: React.Ref<RefHandle>;
  /** Notifies the container when the rendered inline title enters or exits editing mode. */
  onEditingChange?: (editing: boolean) => void;

  /** Whether the row is expanded. */
  expanded: boolean;
  /** Whether the row has any descendants (controls whether the disclosure renders). */
  hasChildren: boolean;
  /** Called when the disclosure caret or Alt+click toggles expansion. */
  onDisclosureClick: (ev?: React.MouseEvent<HTMLElement>) => void;
  /** Imperative expand, used by the "+" button and ArrowRight keydown. */
  onExpand?: () => void;
  /** Imperative collapse, used by ArrowLeft keydown. */
  onCollapse?: () => void;

  /** Drag source ref from the container's drag hook. */
  dragRef?: ConnectDragSource;
  /** Whether the row is being dragged. */
  isDragging?: boolean;
  /** Whether the row's document is being moved. */
  isMoving?: boolean;

  /** Ref to the outer Relative element; some drop hooks need to read it. */
  parentRef?: React.Ref<HTMLDivElement>;
  /** Ref for the row's reparent drop target. */
  dropToReparentRef?: React.Ref<HTMLDivElement>;
  /** Whether the row is an active drop target (visual highlight). */
  isActiveDropTarget?: boolean;

  /** Cursor element rendered above the row. */
  cursorBefore?: React.ReactNode;
  /** Cursor element rendered below the row. */
  cursorAfter?: React.ReactNode;

  /** Menu content rendered by the container. */
  menu?: React.ReactNode;
  /** Whether the menu's action slot is visible (e.g. while the menu is open). */
  menuOpen?: boolean;

  /** When true, the "+" new-child button is rendered in the menu slot. */
  canCreateChild?: boolean;
  /** Submit handler for the inline new-child title input. */
  onCreateChild?: (title: string) => Promise<void>;
  /** Depth of the inline new-child SidebarLink. Defaults to `depth + 1`. */
  newChildDepth?: number;

  /** Context menu action for the row. */
  contextAction?: ActionWithChildren;

  /** Optional override for the active-match function. */
  isActiveOverride?: (
    match: match | null,
    location: Location<{ sidebarContext?: SidebarContextType }>
  ) => boolean;

  /** Content rendered after the row (e.g. a Folder of nested child rows). */
  children?: React.ReactNode;

  /** Called on click intent for prefetching. */
  onClickIntent?: () => void;
};

function DocumentRow({
  documentId,
  document,
  to,
  depth,
  isDraft,
  scrollIntoViewIfNeeded,
  icon,
  unreadBadge,
  label,
  canEdit,
  labelText,
  onTitleChange,
  editableTitleRef,
  onEditingChange,
  expanded,
  hasChildren,
  onDisclosureClick,
  onExpand,
  onCollapse,
  dragRef,
  isDragging,
  isMoving,
  parentRef,
  dropToReparentRef,
  isActiveDropTarget,
  cursorBefore,
  cursorAfter,
  menu,
  menuOpen,
  canCreateChild,
  onCreateChild,
  newChildDepth,
  contextAction,
  isActiveOverride,
  children,
  onClickIntent,
}: DocumentRowProps) {
  const { t } = useTranslation();
  const sidebarContext = useSidebarContext();
  const [isEditing, setIsEditingState] = React.useState(false);
  const setIsEditing = React.useCallback(
    (editing: boolean) => {
      setIsEditingState(editing);
      onEditingChange?.(editing);
    },
    [onEditingChange]
  );
  const [isAddingNewChild, setIsAddingNewChild, closeAddingNewChild] =
    useBoolean();
  const newChildTitleRef = React.useRef<RefHandle>(null);

  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent) => {
      if (!hasChildren) {
        return;
      }
      if (ev.key === "ArrowRight" && !expanded) {
        onExpand?.();
      }
      if (ev.key === "ArrowLeft" && expanded) {
        onCollapse?.();
      }
    },
    [hasChildren, expanded, onExpand, onCollapse]
  );

  const handleAddChild = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();
      setIsAddingNewChild();
      onExpand?.();
    },
    [setIsAddingNewChild, onExpand]
  );

  const handleNewChildSubmit = React.useCallback(
    async (value: string) => {
      if (!onCreateChild) {
        return;
      }
      try {
        newChildTitleRef.current?.setIsEditing(false);
        await onCreateChild(value);
        closeAddingNewChild();
      } catch (_err) {
        newChildTitleRef.current?.setIsEditing(true);
      }
    },
    [onCreateChild, closeAddingNewChild]
  );

  const labelElement =
    label ??
    (labelText !== undefined ? (
      <EditableTitle
        title={labelText}
        onSubmit={onTitleChange ?? (async () => undefined)}
        isEditing={isEditing}
        onEditing={setIsEditing}
        canUpdate={!!canEdit}
        maxLength={DocumentValidation.maxTitleLength}
        ref={editableTitleRef}
      />
    ) : null);

  const hasMenuContent = Boolean(menu) || canCreateChild;
  const menuVisible = hasMenuContent && !isEditing && !isDragging && !isMoving;
  const menuElement = menuVisible ? (
    <Fade>
      {canCreateChild && (
        <Tooltip content={t("New doc")}>
          <NudeButton
            aria-label={t("New nested document")}
            onClick={handleAddChild}
          >
            <PlusIcon />
          </NudeButton>
        </Tooltip>
      )}
      {menu}
    </Fade>
  ) : undefined;

  const defaultIsActive = React.useCallback(
    (
      m: match | null,
      location: Location<{ sidebarContext?: SidebarContextType }>
    ) => {
      if (sidebarContext !== location.state?.sidebarContext) {
        return false;
      }
      return (document && location.pathname.endsWith(document.urlId)) || !!m;
    },
    [sidebarContext, document]
  );

  const sidebarLinkElement = (
    <SidebarLink
      // @ts-expect-error react-router type is wrong, string component is fine.
      component={isEditing ? "div" : undefined}
      depth={depth}
      to={to}
      expanded={hasChildren && !isDragging ? expanded : undefined}
      onDisclosureClick={onDisclosureClick}
      onClickIntent={onClickIntent}
      contextAction={contextAction}
      icon={icon}
      isActive={isActiveOverride ?? defaultIsActive}
      isActiveDrop={isActiveDropTarget}
      label={labelElement}
      ellipsis={!isEditing}
      exact={false}
      scrollIntoViewIfNeeded={scrollIntoViewIfNeeded}
      isDraft={isDraft}
      unreadBadge={unreadBadge}
      $showActions={menuOpen}
      menu={menuElement}
    />
  );

  const withImport = documentId ? (
    <DropToImport documentId={documentId}>{sidebarLinkElement}</DropToImport>
  ) : (
    sidebarLinkElement
  );

  return (
    <ActionContextProvider
      value={{
        activeModels: document ? [document] : [],
      }}
    >
      <Relative ref={parentRef}>
        {cursorBefore}
        <Draggable
          key={documentId}
          ref={dragRef}
          $isDragging={isDragging}
          $isMoving={isMoving}
          onKeyDown={handleKeyDown}
        >
          {dropToReparentRef ? (
            <div ref={dropToReparentRef}>{withImport}</div>
          ) : (
            withImport
          )}
        </Draggable>
        {cursorAfter}
      </Relative>
      {isAddingNewChild && onCreateChild && (
        <SidebarLink
          isActive={() => true}
          depth={newChildDepth ?? depth + 1}
          ellipsis={false}
          label={
            <EditableTitle
              title=""
              canUpdate
              isEditing
              placeholder={`${t("New doc")}…`}
              onCancel={closeAddingNewChild}
              onSubmit={handleNewChildSubmit}
              maxLength={DocumentValidation.maxTitleLength}
              ref={newChildTitleRef}
            />
          }
        />
      )}
      {children}
    </ActionContextProvider>
  );
}

const Draggable = styled.div<{ $isDragging?: boolean; $isMoving?: boolean }>`
  transition: opacity 250ms ease;
  opacity: ${(props) => (props.$isDragging || props.$isMoving ? 0.1 : 1)};
  pointer-events: ${(props) => (props.$isMoving ? "none" : "inherit")};
`;

export default observer(DocumentRow);
