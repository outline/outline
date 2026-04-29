import { useKBar } from "kbar";
import { observer } from "mobx-react";
import { SearchIcon } from "outline-icons";
import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { metaDisplay, shortcutSeparator } from "@shared/utils/keyboard";
import type Share from "~/models/Share";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import useCurrentUser from "~/hooks/useCurrentUser";
import useShareBranding from "~/hooks/useShareBranding";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import { homePath, sharedModelPath } from "~/utils/routeHelpers";
import { AvatarSize } from "../Avatar";
import TeamLogo from "../TeamLogo";
import Sidebar from "./Sidebar";
import SidebarExpansionContext, {
  useSidebarExpansionState,
} from "./components/SidebarExpansionContext";
import Section from "./components/Section";
import { SharedCollectionLink } from "./components/SharedCollectionLink";
import { SharedDocumentLink } from "./components/SharedDocumentLink";
import SidebarButton from "./components/SidebarButton";

type Props = {
  share: Share;
};

function SharedSidebar({ share }: Props) {
  const user = useCurrentUser({ rejectOnEmpty: false });
  const { ui, documents, collections } = useStores();
  const { t } = useTranslation();
  const { query } = useKBar();

  const { displayName, displayLogoUrl, displayLogoModel, brandingAvailable } =
    useShareBranding(share);
  const rootNode = share.tree;
  const shareId = share.urlId || share.id;
  const collection = collections.get(rootNode?.id);
  const hideRootNode = collection
    ? ProsemirrorHelper.isEmptyData(collection?.data)
    : false;

  const handleOpenSearch = useCallback(() => {
    query.toggle();
  }, [query]);

  const rootChildren = useMemo(
    () => (rootNode ? [rootNode] : undefined),
    [rootNode]
  );
  const expansion = useSidebarExpansionState(rootChildren, ui.activeDocumentId);

  useEffect(() => {
    ui.tocVisible = share.showTOC;
  }, []);

  if (!rootNode?.children.length) {
    return null;
  }

  return (
    <Sidebar canCollapse={false}>
      {brandingAvailable && (
        <SidebarButton
          title={displayName}
          image={
            <TeamLogo
              model={displayLogoModel}
              src={displayLogoUrl ?? undefined}
              size={AvatarSize.XLarge}
              alt={t("Logo")}
            />
          }
          disabled={hideRootNode}
          onClick={
            hideRootNode
              ? undefined
              : () => history.push(user ? homePath() : sharedModelPath(shareId))
          }
        />
      )}
      <ScrollContainer topShadow flex>
        <TopSection>
          <SearchButton onClick={handleOpenSearch}>
            <SearchIcon size={20} />
            <SearchLabel>{t("Search")}</SearchLabel>
            <Shortcut>
              {metaDisplay}
              {shortcutSeparator}K
            </Shortcut>
          </SearchButton>
        </TopSection>
        <Section as="nav" aria-label={t("Documents")}>
          <SidebarExpansionContext.Provider value={expansion}>
            {share.collectionId ? (
              <SharedCollectionLink
                node={rootNode}
                shareId={shareId}
                hideRootNode={hideRootNode}
              />
            ) : (
              <SharedDocumentLink
                index={0}
                // If the root node has an icon we need some extra space for it
                depth={rootNode.icon ? 1 : 0}
                shareId={shareId}
                node={rootNode}
                prefetchDocument={documents.prefetchDocument}
                activeDocumentId={ui.activeDocumentId}
                activeDocument={documents.active}
              />
            )}
          </SidebarExpansionContext.Provider>
        </Section>
      </ScrollContainer>
    </Sidebar>
  );
}

const ScrollContainer = styled(Scrollable)`
  padding-bottom: 16px;
`;

const TopSection = styled(Flex)`
  padding: 8px;
  flex-shrink: 0;
`;

const SearchButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 12px;
  margin: 8px 0;
  border: 1px solid ${s("inputBorder")};
  border-radius: 16px;
  background: ${s("background")};
  color: ${s("textTertiary")};
  cursor: var(--pointer);
  font-size: 14px;

  &:hover {
    border-color: ${s("inputBorderFocused")};
    color: ${s("textSecondary")};
  }
`;

const SearchLabel = styled.span`
  flex-grow: 1;
  text-align: start;
`;

const Shortcut = styled.span`
  flex-shrink: 0;
  font-size: 13px;
`;

export default observer(SharedSidebar);
