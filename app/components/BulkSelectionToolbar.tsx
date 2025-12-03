import { observer } from "mobx-react";
import { ArchiveIcon, CrossIcon, MoveIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import BulkDeleteDialog from "./BulkDeleteDialog";
import BulkArchiveDialog from "./BulkArchiveDialog";
import BulkMoveDialog from "./BulkMoveDialog";

function BulkSelectionToolbar() {
  const { t } = useTranslation();
  const { documents, dialogs, policies, ui } = useStores();
  const selectedCount = documents.selectedCount;

  const selectedDocuments = documents.selectedDocuments;
  const canArchiveAll = selectedDocuments.every(
    (doc) => policies.abilities(doc.id).archive
  );
  const canDeleteAll = selectedDocuments.every(
    (doc) => policies.abilities(doc.id).delete
  );
  const canMoveAll = selectedDocuments.every(
    (doc) => policies.abilities(doc.id).move
  );

  const handleClear = React.useCallback(
    (ev: React.MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      documents.clearSelection();
    },
    [documents]
  );

  const handleArchive = React.useCallback(
    (ev: React.MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      dialogs.openModal({
        title: t("Archive {{ count }} documents", { count: selectedCount }),
        content: (
          <BulkArchiveDialog
            documents={selectedDocuments}
            onSubmit={dialogs.closeAllModals}
          />
        ),
      });
    },
    [dialogs, selectedCount, selectedDocuments, t]
  );

  const handleDelete = React.useCallback(
    (ev: React.MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      dialogs.openModal({
        title: t("Delete {{ count }} documents", { count: selectedCount }),
        content: (
          <BulkDeleteDialog
            documents={selectedDocuments}
            onSubmit={dialogs.closeAllModals}
          />
        ),
      });
    },
    [dialogs, selectedCount, selectedDocuments, t]
  );

  const handleMove = React.useCallback(
    (ev: React.MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      dialogs.openModal({
        title: t("Move {{ count }} documents", { count: selectedCount }),
        content: (
          <BulkMoveDialog
            documents={selectedDocuments}
            onSubmit={dialogs.closeAllModals}
          />
        ),
      });
    },
    [dialogs, selectedCount, selectedDocuments, t]
  );

  const sidebarWidth = ui.sidebarWidth;

  if (selectedCount === 0) {
    return null;
  }

  return (
    <Wrapper $sidebarWidth={sidebarWidth}>
      <MenuContainer>
        <Header>
          <CountText>
            {t("{{ count }} selected", { count: selectedCount })}
          </CountText>
          <Tooltip content={t("Clear selection")} placement="top">
            <ClearButton onClick={handleClear}>
              <CrossIcon size={18} />
            </ClearButton>
          </Tooltip>
        </Header>
        <MenuSeparator />
        {canArchiveAll && (
          <MenuItem onClick={handleArchive}>
            <MenuIconWrapper>
              <ArchiveIcon />
            </MenuIconWrapper>
            <MenuLabel>{t("Archive")}</MenuLabel>
          </MenuItem>
        )}
        {canMoveAll && (
          <MenuItem onClick={handleMove}>
            <MenuIconWrapper>
              <MoveIcon />
            </MenuIconWrapper>
            <MenuLabel>{t("Move")}</MenuLabel>
          </MenuItem>
        )}
        {canDeleteAll && (
          <MenuItem onClick={handleDelete} $dangerous>
            <MenuIconWrapper>
              <TrashIcon />
            </MenuIconWrapper>
            <MenuLabel>{t("Delete")}</MenuLabel>
          </MenuItem>
        )}
      </MenuContainer>
    </Wrapper>
  );
}

const Wrapper = styled.div<{ $sidebarWidth: number }>`
  position: fixed;
  bottom: 24px;
  left: ${(props) => props.$sidebarWidth + 16}px;
  z-index: ${depths.menu};
`;

const MenuContainer = styled.div`
  background: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  border-radius: 6px;
  padding: 6px;
  min-width: 180px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 4px;
`;

const CountText = styled.span`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${s("textTertiary")};
  letter-spacing: 0.04em;
`;

const ClearButton = styled(NudeButton)`
  width: 24px;
  height: 24px;
  color: ${s("textTertiary")};

  &:hover {
    color: ${s("text")};
    background: ${s("sidebarControlHoverBackground")};
  }
`;

const MenuSeparator = styled.hr`
  margin: 6px 0;
  border: none;
  border-top: 1px solid ${s("divider")};
`;

const MenuItem = styled.button<{ $dangerous?: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 32px;
  font-size: 16px;
  cursor: var(--pointer);
  user-select: none;
  white-space: nowrap;
  background: none;
  color: ${s("textSecondary")};
  margin: 0;
  border: 0;
  border-radius: 4px;
  padding: 12px;

  &:hover {
    color: ${s("accentText")};
    background: ${(props) =>
      props.$dangerous ? props.theme.danger : props.theme.accent};

    svg {
      color: ${s("accentText")};
      fill: ${s("accentText")};
    }
  }

  ${breakpoint("tablet")`
    padding: 4px 12px;
    font-size: 14px;
  `}
`;

const MenuIconWrapper = styled.span`
  width: 24px;
  height: 24px;
  margin-right: 6px;
  margin-left: -4px;
  color: ${s("textSecondary")};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MenuLabel = styled.span`
  flex-grow: 1;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export default observer(BulkSelectionToolbar);
