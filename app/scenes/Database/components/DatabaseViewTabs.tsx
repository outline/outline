import { observer } from "mobx-react";
import { PlusIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { DataView } from "@shared/types";
import { DataViewType } from "@shared/types";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useOnClickOutside from "~/hooks/useOnClickOutside";

type Props = {
  /** The saved views to render as tabs, in order. */
  views: DataView[];
  /** The id of the view currently being displayed. */
  activeViewId?: string;
  /** Whether the user may add, rename and remove views. */
  canEdit: boolean;
  /** Callback when a tab is selected. */
  onSelect: (viewId: string) => void;
  /** Callback when a new view of the given type is requested. */
  onCreate: (type: DataViewType) => void;
  /** Callback when a view is renamed. */
  onRename: (viewId: string, name: string) => void;
  /** Callback when a view is removed. */
  onDelete: (viewId: string) => void;
  /** Content rendered at the right edge of the bar, e.g. toolbar toggles. */
  trailing?: React.ReactNode;
};

/**
 * The tab bar across the top of a database, listing its saved views. A
 * database may hold any number of views, including several of the same type,
 * so views are identified by name rather than by layout.
 */
function DatabaseViewTabs({
  views,
  activeViewId,
  canEdit,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  trailing,
}: Props) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = React.useState(false);
  const [renamingId, setRenamingId] = React.useState<string>();
  const addRef = React.useRef<HTMLDivElement>(null);

  useOnClickOutside(addRef, () => setIsAdding(false));

  const typeLabels: { type: DataViewType; label: string }[] = [
    { type: DataViewType.Table, label: t("Table") },
    { type: DataViewType.Board, label: t("Board") },
    { type: DataViewType.List, label: t("List") },
    { type: DataViewType.Gallery, label: t("Gallery") },
  ];

  const handleRenameSubmit = (viewId: string, value: string) => {
    const name = value.trim();
    if (name) {
      onRename(viewId, name);
    }
    setRenamingId(undefined);
  };

  return (
    <Bar align="center" gap={4}>
      {views.map((view) =>
        renamingId === view.id ? (
          <RenameInput
            key={view.id}
            defaultValue={view.name}
            autoFocus
            onBlur={(event) => handleRenameSubmit(view.id, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleRenameSubmit(view.id, event.currentTarget.value);
              }
              if (event.key === "Escape") {
                setRenamingId(undefined);
              }
            }}
          />
        ) : (
          <TabButton
            key={view.id}
            type="button"
            $active={view.id === activeViewId}
            onClick={() => onSelect(view.id)}
            onDoubleClick={() => canEdit && setRenamingId(view.id)}
          >
            {view.name}
            {canEdit && view.id === activeViewId && views.length > 1 && (
              <Tooltip content={t("Delete view")}>
                <RemoveButton
                  as="span"
                  role="button"
                  tabIndex={0}
                  aria-label={t("Delete view")}
                  onClick={(event: React.MouseEvent) => {
                    event.stopPropagation();
                    onDelete(view.id);
                  }}
                >
                  <TrashIcon size={16} />
                </RemoveButton>
              </Tooltip>
            )}
          </TabButton>
        )
      )}

      {canEdit && (
        <AddContainer ref={addRef}>
          <Tooltip content={t("Add a view")}>
            <NudeButton onClick={() => setIsAdding(!isAdding)}>
              <PlusIcon size={20} />
            </NudeButton>
          </Tooltip>
          {isAdding && (
            <Menu>
              {typeLabels.map(({ type, label }) => (
                <MenuItem
                  key={type}
                  type="button"
                  onClick={() => {
                    onCreate(type);
                    setIsAdding(false);
                  }}
                >
                  {label}
                </MenuItem>
              ))}
            </Menu>
          )}
        </AddContainer>
      )}
      {trailing && <Trailing>{trailing}</Trailing>}
    </Bar>
  );
}

const Bar = styled(Flex)`
  flex-wrap: wrap;
  border-bottom: 1px solid ${s("divider")};
  margin-bottom: 12px;
`;

const Trailing = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  padding: 0 2px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: ${(props) => (props.$active ? 600 : 400)};
  color: ${(props) => (props.$active ? s("text") : s("textSecondary"))};
  border-bottom: 2px solid
    ${(props) => (props.$active ? props.theme.textSecondary : "transparent")};
  padding: 6px 8px;
  margin-bottom: -1px;
  cursor: var(--pointer);

  &:hover {
    color: ${s("text")};
  }
`;

const RemoveButton = styled.span`
  display: inline-flex;
  color: ${s("textTertiary")};

  &:hover {
    color: ${s("danger")};
  }
`;

const RenameInput = styled.input`
  font-size: 14px;
  padding: 6px 8px;
  border: 1px solid ${s("inputBorder")};
  border-radius: 4px;
  background: ${s("background")};
  color: ${s("text")};
  max-width: 160px;
`;

const AddContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 0 4px;
`;

const Menu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1;
  min-width: 140px;
  padding: 4px;
  background: ${s("menuBackground")};
  border-radius: 6px;
  box-shadow: ${s("menuShadow")};
`;

const MenuItem = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: none;
  font-size: 14px;
  color: ${s("text")};
  padding: 6px 8px;
  border-radius: 4px;
  cursor: var(--pointer);

  &:hover {
    background: ${s("listItemHoverBackground")};
  }
`;

export default observer(DatabaseViewTabs);
