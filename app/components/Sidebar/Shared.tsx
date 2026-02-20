import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { hover } from "@shared/styles";
import type Share from "~/models/Share";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import SearchPopover from "~/components/SearchPopover";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import { homePath, sharedModelPath } from "~/utils/routeHelpers";
import { AvatarSize } from "../Avatar";
import { useTeamContext } from "../TeamContext";
import TeamLogo from "../TeamLogo";
import Sidebar from "./Sidebar";
import Section from "./components/Section";
import { SharedCollectionLink } from "./components/SharedCollectionLink";
import { SharedDocumentLink } from "./components/SharedDocumentLink";
import SidebarButton from "./components/SidebarButton";
import { useEffect } from "react";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";

type Props = {
  share: Share;
};

function SharedSidebar({ share }: Props) {
  const team = useTeamContext();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const { ui, documents, collections } = useStores();
  const { t } = useTranslation();

  const teamAvailable = !!team?.name;
  const rootNode = share.tree;
  const shareId = share.urlId || share.id;
  const collection = collections.get(rootNode?.id);
  const hideRootNode = collection
    ? ProsemirrorHelper.isEmptyData(collection?.data)
    : false;

  useEffect(() => {
    ui.tocVisible = share.showTOC;
  }, []);

  if (!rootNode?.children.length) {
    return null;
  }

  return (
    <StyledSidebar $hoverTransition={!teamAvailable} canCollapse={false}>
      {teamAvailable && (
        <SidebarButton
          title={team.name}
          image={
            <TeamLogo model={team} size={AvatarSize.XLarge} alt={t("Logo")} />
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
          <SearchWrapper>
            <StyledSearchPopover shareId={shareId} />
          </SearchWrapper>
        </TopSection>
        <Section>
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
        </Section>
      </ScrollContainer>
    </StyledSidebar>
  );
}

const ScrollContainer = styled(Scrollable)`
  padding-bottom: 16px;
`;

const TopSection = styled(Flex)`
  padding: 8px;
  flex-shrink: 0;
`;

const SearchWrapper = styled.div`
  width: 100%;
`;

const StyledSearchPopover = styled(SearchPopover)`
  width: 100%;
  transition: width 100ms ease-out;
  margin: 8px 0;
`;

const ToggleWrapper = styled.div`
  position: absolute;
  right: 0;
  opacity: 0;
  transform: translateX(10px);
  transition:
    opacity 100ms ease-out,
    transform 100ms ease-out;
`;

const StyledSidebar = styled(Sidebar)<{ $hoverTransition: boolean }>`
  ${({ $hoverTransition }) =>
    $hoverTransition &&
    `
      @media (hover: hover) {
        &:${hover} {
        ${StyledSearchPopover} {
          width: 85%;
        }

        ${ToggleWrapper} {
          opacity: 1;
          transform: translateX(0);
          }
        }
      }
    `}
`;

export default observer(SharedSidebar);
