import type { Location, LocationDescriptor } from "history";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import type { ConnectDropTarget } from "react-dnd";
import { useTranslation } from "react-i18next";
import { mergeRefs } from "react-merge-refs";
import type { match } from "react-router";
import { CollectionValidation, DocumentValidation } from "@shared/validations";
import type Collection from "~/models/Collection";
import EditableTitle, { type RefHandle } from "~/components/EditableTitle";
import Fade from "~/components/Fade";
import CollectionIcon from "~/components/Icons/CollectionIcon";
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

export type CollectionRowProps = {
  /** Collection model for the row. */
  collection: Collection;
  /** Indentation depth of the row. */
  depth?: number;

  /** Navigation target for the row. */
  to: LocationDescriptor;
  /** Click handler for the row. */
  onClick?: () => void;
  /** Called on click intent for prefetching. */
  onClickIntent?: () => void;
  /** Optional override for the active-match function. */
  isActiveOverride?: (
    match: match | null,
    location: Location<{ sidebarContext?: SidebarContextType }>
  ) => boolean;

  /** Icon displayed to the left of the label. Defaults to CollectionIcon. */
  icon?: React.ReactNode;

  /** Whether the row is expanded. Pass undefined to hide the disclosure. */
  expanded?: boolean;
  /** Called when the disclosure caret toggles expansion. */
  onDisclosureClick: (ev?: React.MouseEvent<HTMLElement>) => void;
  /** Imperative expand, used by the "+" button to auto-expand. */
  onExpand?: () => void;

  /** When true, the name renders as an EditableTitle. */
  canEdit?: boolean;
  /** Title displayed and edited when canEdit is true. */
  labelText?: string;
  /** Submit handler for the edited title. */
  onTitleChange?: (value: string) => Promise<void>;
  /** Forwarded ref to the EditableTitle so the container can trigger rename. */
  editableTitleRef?: React.Ref<RefHandle>;
  /** Notifies the container when the inline title's editing state changes. */
  onEditingChange?: (editing: boolean) => void;

  /** Context menu action for the row. */
  contextAction?: ActionWithChildren;
  /** Menu content rendered by the container; wrapped in Fade. */
  menu?: React.ReactNode;
  /** Whether the menu's action slot is visible (e.g. while the menu is open). */
  menuOpen?: boolean;

  /** When true, the "+" new-child button is rendered in the menu slot. */
  canCreateChild?: boolean;
  /** Submit handler for the inline new-child title input. */
  onCreateChild?: (title: string) => Promise<void>;
  /** Depth of the inline new-child SidebarLink. Defaults to 2. */
  newChildDepth?: number;

  /** Ref forwarded to the outer Relative; for drag hover timers. */
  parentRef?: React.Ref<HTMLDivElement>;
  /** Drop target connector for "change collection" / reorder. */
  dropRef?: ConnectDropTarget;
  /** Whether the row is an active drop target (visual highlight). */
  isActiveDropTarget?: boolean;

  /** Content rendered after the row (e.g. CollectionLinkChildren). */
  children?: React.ReactNode;
};

function CollectionRow({
  collection,
  depth = 0,
  to,
  onClick,
  onClickIntent,
  isActiveOverride,
  icon,
  expanded,
  onDisclosureClick,
  onExpand,
  canEdit,
  labelText,
  onTitleChange,
  editableTitleRef,
  onEditingChange,
  contextAction,
  menu,
  menuOpen,
  canCreateChild,
  onCreateChild,
  newChildDepth = 2,
  parentRef,
  dropRef,
  isActiveDropTarget,
  children,
}: CollectionRowProps) {
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

  const defaultIsActive = React.useCallback(
    (
      _m: match | null,
      location: Location<{ sidebarContext?: SidebarContextType }>
    ) => !!_m && location.state?.sidebarContext === sidebarContext,
    [sidebarContext]
  );

  const labelElement = canEdit ? (
    <EditableTitle
      title={labelText ?? collection.name}
      onSubmit={onTitleChange ?? (async () => undefined)}
      isEditing={isEditing}
      onEditing={setIsEditing}
      canUpdate={canEdit}
      maxLength={CollectionValidation.maxNameLength}
      ref={editableTitleRef}
    />
  ) : (
    collection.name
  );

  const iconElement = icon ?? (
    <CollectionIcon collection={collection} expanded={expanded} />
  );

  const hasMenuContent = Boolean(menu) || canCreateChild;
  const menuVisible = hasMenuContent && !isEditing;
  const menuElement = menuVisible ? (
    <Fade>
      {canCreateChild && (
        <Tooltip content={t("New doc")} delay={500}>
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

  const mergedRef = React.useMemo(
    () =>
      mergeRefs<HTMLDivElement>(
        [parentRef, dropRef].filter(Boolean) as React.Ref<HTMLDivElement>[]
      ),
    [parentRef, dropRef]
  );

  const sidebarLinkElement = (
    <SidebarLink
      // @ts-expect-error react-router type is wrong, string component is fine.
      component={isEditing ? "div" : undefined}
      depth={depth}
      to={to}
      onClick={onClick}
      onClickIntent={onClickIntent}
      contextAction={contextAction}
      expanded={expanded}
      onDisclosureClick={onDisclosureClick}
      icon={iconElement}
      isActive={isActiveOverride ?? defaultIsActive}
      isActiveDrop={isActiveDropTarget}
      label={labelElement}
      ellipsis={!isEditing}
      exact={false}
      $showActions={menuOpen}
      menu={menuElement}
    />
  );

  return (
    <ActionContextProvider value={{ activeModels: [collection] }}>
      <Relative ref={mergedRef}>
        <DropToImport collectionId={collection.id}>
          {sidebarLinkElement}
        </DropToImport>
      </Relative>
      {isAddingNewChild && onCreateChild && (
        <SidebarLink
          isActive={() => true}
          depth={newChildDepth}
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

export default observer(CollectionRow);
