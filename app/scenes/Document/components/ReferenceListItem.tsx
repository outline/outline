import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import EventBoundary from "@shared/components/EventBoundary";
import Icon from "@shared/components/Icon";
import { s, hover, ellipsis } from "@shared/styles";
import type { NavigationNode } from "@shared/types";
import { IconType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import useShare from "@shared/hooks/useShare";
import Document from "~/models/Document";
import Flex from "~/components/Flex";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import NudeButton from "~/components/NudeButton";
import type { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useDocumentMenuAction } from "~/hooks/useDocumentMenuAction";
import DocumentMenu from "~/menus/DocumentMenu";
import { sharedModelPath } from "~/utils/routeHelpers";
import useBoolean from "~/hooks/useBoolean";
import useClickIntent from "~/hooks/useClickIntent";
import useStores from "~/hooks/useStores";
import { useCallback } from "react";
import useCurrentUser from "~/hooks/useCurrentUser";

type Props = {
  document: Document | NavigationNode;
  anchor?: string;
  showCollection?: boolean;
  sidebarContext?: SidebarContextType;
};

const Actions = styled(EventBoundary)`
  display: none;
  align-items: center;
  flex-shrink: 0;
  flex-grow: 0;
  color: ${s("textSecondary")};

  ${NudeButton}:${hover},
  ${NudeButton}[aria-expanded= "true"] {
    background: ${s("sidebarControlHoverBackground")};
  }

  ${breakpoint("tablet")`
    display: flex;
  `};
`;

const DocumentLink = styled(Link)<{ $menuOpen?: boolean }>`
  display: flex;
  align-items: center;
  margin: 2px -8px;
  padding: 6px 8px;
  border-radius: 8px;
  max-height: 50vh;
  min-width: 100%;
  overflow: hidden;
  position: relative;
  cursor: var(--pointer);

  ${Actions} {
    opacity: 0;
  }

  &:${hover},
  &:active,
  &:focus,
  &:focus-within {
    background: ${s("listItemHoverBackground")};

    ${Actions} {
      opacity: 1;
    }
  }

  ${(props) =>
    props.$menuOpen &&
    css`
      background: ${s("listItemHoverBackground")};

      ${Actions} {
        opacity: 1;
      }
    `}
`;

const Content = styled(Flex)`
  flex-grow: 1;
  min-width: 0;
  color: ${s("textSecondary")};
  margin-left: -4px;
`;

const Title = styled.div`
  ${ellipsis()}
  font-size: 14px;
  font-weight: 500;
  line-height: 1.25;
  padding-top: 3px;
  color: ${s("text")};
  font-family: ${s("fontFamily")};
`;

function ReferenceListItem({
  document,
  showCollection,
  anchor,
  sidebarContext,
  ...rest
}: Props) {
  const { documents } = useStores();
  const { shareId } = useShare();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const prefetchDocument = useCallback(async () => {
    await documents.prefetchDocument(document.id);
  }, [documents, document.id]);
  const { handleMouseEnter, handleMouseLeave } =
    useClickIntent(prefetchDocument);
  const { icon, color } = document;
  const isEmoji = determineIconType(icon) === IconType.Emoji;
  const title =
    document instanceof Document ? document.titleWithDefault : document.title;
  const initial = title.charAt(0).toUpperCase();
  const showContextMenu = document instanceof Document && !!user;

  const link = (
    <DocumentLink
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      $menuOpen={menuOpen}
      to={{
        pathname: shareId
          ? sharedModelPath(shareId, document.url)
          : document.url,
        hash: anchor ? `d-${anchor}` : undefined,
        state: {
          title: document.title,
          sidebarContext,
        },
      }}
      {...rest}
    >
      <Content gap={4} dir="auto">
        {icon ? (
          <Icon value={icon} color={color ?? undefined} initial={initial} />
        ) : (
          <DocumentIcon />
        )}
        <Title>{isEmoji ? title.replace(icon!, "") : title}</Title>
      </Content>
      {showContextMenu && (
        <Actions>
          <DocumentMenu
            document={document}
            onOpen={handleMenuOpen}
            onClose={handleMenuClose}
          />
        </Actions>
      )}
    </DocumentLink>
  );

  if (!showContextMenu) {
    return <li>{link}</li>;
  }

  return (
    <li>
      <ReferenceListItemContextMenu
        document={document}
        handleMenuOpen={handleMenuOpen}
        handleMenuClose={handleMenuClose}
      >
        {link}
      </ReferenceListItemContextMenu>
    </li>
  );
}

const ReferenceListItemContextMenu = observer(
  function ReferenceListItemContextMenu_({
    document,
    children,
    handleMenuOpen,
    handleMenuClose,
  }: {
    document: Document;
    handleMenuOpen: () => void;
    handleMenuClose: () => void;
    children: React.ReactNode;
  }) {
    const { t } = useTranslation();
    const { isShare } = useShare();
    const contextMenuAction = useDocumentMenuAction({
      documentId: document.id,
    });

    return (
      <ActionContextProvider
        value={{
          activeModels: [
            document,
            ...(!isShare && document.collection ? [document.collection] : []),
          ],
        }}
      >
        <ContextMenu
          action={contextMenuAction}
          ariaLabel={t("Document options")}
          onOpen={handleMenuOpen}
          onClose={handleMenuClose}
        >
          {children}
        </ContextMenu>
      </ActionContextProvider>
    );
  }
);

export default observer(ReferenceListItem);
