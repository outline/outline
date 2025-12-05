import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import {
  MenuHeader,
  MenuSeparator,
} from "~/components/primitives/components/Menu";
import { Portal } from "~/components/Portal";
import { toMobileMenuItems } from "~/components/Menu/transformer";
import { actionToMenuItem } from "~/actions";
import { useBulkDocumentMenuAction } from "~/hooks/useBulkDocumentMenuAction";
import useActionContext from "~/hooks/useActionContext";
import useStores from "~/hooks/useStores";
import { ActionVariant } from "~/types";
import NudeButton from "./NudeButton";
import { CrossIcon } from "outline-icons";

function BulkSelectionToolbar() {
  const { t } = useTranslation();
  const { documents, ui } = useStores();
  const selectedCount = documents.selectedDocumentIds.length;
  const selectedDocuments = documents.selectedDocuments;
  const sidebarWidth = ui.sidebarWidth;

  const handleClearSelection = React.useCallback(() => {
    documents.clearSelection();
  }, [documents]);

  const rootAction = useBulkDocumentMenuAction({
    documents: selectedDocuments,
  });

  const actionContext = useActionContext({
    isMenu: true,
  });

  const menuItems = React.useMemo(() => {
    if (!rootAction.children || selectedCount === 0) {
      return [];
    }

    return (rootAction.children as ActionVariant[]).map((childAction) =>
      actionToMenuItem(childAction, actionContext)
    );
  }, [rootAction.children, selectedCount, actionContext]);

  const content = toMobileMenuItems(menuItems, handleClearSelection, () => {});

  if (selectedCount === 0) {
    return null;
  }

  return (
    <Portal>
      <Wrapper $sidebarWidth={sidebarWidth}>
        <MenuContainer>
          <Header>
            <MenuHeader>
              {t("{{ count }} selected", { count: selectedCount })}
            </MenuHeader>
            <ClearButton
              onClick={handleClearSelection}
              tooltip={{
                content: t("Clear selection"),
              }}
            >
              <CrossIcon size={18} />
            </ClearButton>
          </Header>
          <MenuSeparator />
          {content}
        </MenuContainer>
      </Wrapper>
    </Portal>
  );
}

const ClearButton = styled(NudeButton)`
  &:hover {
    color: ${s("text")};
    background: ${s("sidebarControlHoverBackground")};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Wrapper = styled.div<{ $sidebarWidth: number }>`
  position: fixed;
  bottom: 24px;
  left: ${(props) => props.$sidebarWidth + 16}px;
  z-index: ${depths.menu};
`;

const MenuContainer = styled.div`
  min-width: 180px;
  background: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  border-radius: 6px;
  padding: 6px;
`;

export default observer(BulkSelectionToolbar);
