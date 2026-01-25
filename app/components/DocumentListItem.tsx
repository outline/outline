import {
  useFocusEffect,
  useRovingTabIndex,
} from "@getoutline/react-roving-tabindex";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DocumentIcon } from "outline-icons";
import styled, { css, useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import EventBoundary from "@shared/components/EventBoundary";
import Icon from "@shared/components/Icon";
import { s, hover } from "@shared/styles";
import type Document from "~/models/Document";
import Badge from "~/components/Badge";
import DocumentMeta from "~/components/DocumentMeta";
import Flex from "~/components/Flex";
import Highlight from "~/components/Highlight";
import NudeButton from "~/components/NudeButton";
import StarButton, { AnimatedStar } from "~/components/Star";
import Tooltip from "~/components/Tooltip";
import useBoolean from "~/hooks/useBoolean";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import DocumentMenu from "~/menus/DocumentMenu";
import { documentPath } from "~/utils/routeHelpers";
import { determineSidebarContext } from "./Sidebar/components/SidebarContext";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useDocumentMenuAction } from "~/hooks/useDocumentMenuAction";
import { ContextMenu } from "./Menu/ContextMenu";
import useStores from "~/hooks/useStores";

type Props = {
  document: Document;
  highlight?: string | undefined;
  context?: string | undefined;
  showParentDocuments?: boolean;
  showCollection?: boolean;
  showPublished?: boolean;
  showDraft?: boolean;
  showTemplate?: boolean;
};

const SEARCH_RESULT_REGEX = /<b\b[^>]*>(.*?)<\/b>/gi;

function replaceResultMarks(tag: string) {
  // don't use SEARCH_RESULT_REGEX directly here as it causes an infinite loop
  return tag.replace(new RegExp(SEARCH_RESULT_REGEX.source), "$1");
}

function DocumentListItem(
  props: Props,
  ref: React.RefObject<HTMLAnchorElement>
) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const theme = useTheme();
  const { userMemberships, groupMemberships } = useStores();
  const locationSidebarContext = useLocationSidebarContext();
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();

  let itemRef: React.Ref<HTMLAnchorElement> =
    React.useRef<HTMLAnchorElement>(null);
  if (ref) {
    itemRef = ref;
  }

  const { focused, ...rovingTabIndex } = useRovingTabIndex(itemRef, false);
  useFocusEffect(focused, itemRef);

  const {
    document,
    showParentDocuments,
    showCollection,
    showPublished,
    showDraft = true,
    showTemplate,
    highlight,
    context,
    ...rest
  } = props;
  const queryIsInTitle =
    !!highlight &&
    !!document.title.toLowerCase().includes(highlight.toLowerCase());
  const canStar = !document.isArchived && !document.isTemplate;

  const isShared = !!(
    userMemberships.getByDocumentId(document.id) ||
    groupMemberships.getByDocumentId(document.id)
  );

  const sidebarContext = determineSidebarContext({
    document,
    user,
    currentContext: locationSidebarContext,
  });

  const contextMenuAction = useDocumentMenuAction({ documentId: document.id });

  return (
    <ActionContextProvider
      value={{
        activeDocumentId: document.id,
        activeCollectionId:
          !isShared && document.collectionId
            ? document.collectionId
            : undefined,
      }}
    >
      <ContextMenu
        action={contextMenuAction}
        ariaLabel={t("Document options")}
        onOpen={handleMenuOpen}
        onClose={handleMenuClose}
      >
        <DocumentLink
          ref={itemRef}
          dir={document.dir}
          $isStarred={document.isStarred}
          $menuOpen={menuOpen}
          to={{
            pathname: documentPath(document),
            search: highlight
              ? `?q=${encodeURIComponent(highlight)}`
              : undefined,
            state: {
              title: document.titleWithDefault,
              sidebarContext,
            },
          }}
          {...rest}
          {...rovingTabIndex}
        >
          <Flex gap={4} auto>
            <IconWrapper>
              {document.icon ? (
                <Icon
                  value={document.icon}
                  color={document.color ?? undefined}
                  initial={document.initial}
                />
              ) : (
                <DocumentIcon
                  outline={document.isDraft}
                  color={theme.textSecondary}
                />
              )}
            </IconWrapper>
            <Content>
              <Heading dir={document.dir}>
                <Title
                  text={document.titleWithDefault}
                  highlight={highlight}
                  dir={document.dir}
                />
                {document.isBadgedNew && document.createdBy?.id !== user.id && (
                  <Badge yellow>{t("New")}</Badge>
                )}
                {document.isDraft && showDraft && (
                  <Tooltip content={t("Only visible to you")} placement="top">
                    <Badge>{t("Draft")}</Badge>
                  </Tooltip>
                )}
                {canStar && <StarButton document={document} />}
                {document.isTemplate && showTemplate && (
                  <Badge primary>{t("Template")}</Badge>
                )}
              </Heading>

              {!queryIsInTitle && (
                <ResultContext
                  text={context}
                  highlight={highlight ? SEARCH_RESULT_REGEX : undefined}
                  processResult={replaceResultMarks}
                />
              )}
              <DocumentMeta
                document={document}
                showCollection={showCollection}
                showPublished={showPublished}
                showParentDocuments={showParentDocuments}
                showLastViewed
              />
            </Content>
          </Flex>
          <Actions>
            <DocumentMenu
              document={document}
              onOpen={handleMenuOpen}
              onClose={handleMenuClose}
            />
          </Actions>
        </DocumentLink>
      </ContextMenu>
    </ActionContextProvider>
  );
}

const IconWrapper = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  width: 24px;
`;

const Content = styled.div`
  flex-grow: 1;
  flex-shrink: 1;
  min-width: 0;
`;

const Actions = styled(EventBoundary)`
  display: none;
  align-items: center;
  margin: 8px;
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

const DocumentLink = styled(Link)<{
  $isStarred?: boolean;
  $menuOpen?: boolean;
}>`
  display: flex;
  align-items: center;
  margin: 10px -8px;
  padding: 6px 8px;
  border-radius: 8px;
  max-height: 50vh;
  width: calc(100vw - 8px);
  cursor: var(--pointer);

  &:focus-visible {
    outline: none;
  }

  ${breakpoint("tablet")`
    width: auto;
  `};

  ${Actions} {
    opacity: 0;
  }

  ${AnimatedStar} {
    opacity: ${(props) => (props.$isStarred ? "1 !important" : 0)};
  }

  &:${hover},
  &:active,
  &:focus,
  &:focus-within {
    background: ${s("listItemHoverBackground")};

    ${Actions} {
      opacity: 1;
    }

    ${AnimatedStar} {
      opacity: 0.5;

      &:${hover} {
        opacity: 1;
      }
    }
  }

  ${(props) =>
    props.$menuOpen &&
    css`
      background: ${s("listItemHoverBackground")};

      ${Actions} {
        opacity: 1;
      }

      ${AnimatedStar} {
        opacity: 0.5;
      }
    `}
`;

const Heading = styled.span<{ rtl?: boolean }>`
  display: flex;
  justify-content: ${(props) => (props.rtl ? "flex-end" : "flex-start")};
  align-items: center;
  margin-top: 0;
  margin-bottom: 0.1em;
  white-space: nowrap;
  color: ${s("text")};
  font-family: ${s("fontFamily")};
  font-weight: 500;
  font-size: 18px;
  line-height: 1.2;
  gap: 4px;
`;

const Title = styled(Highlight)`
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ResultContext = styled(Highlight)`
  display: block;
  color: ${s("textSecondary")};
  font-size: 15px;
  margin-top: -0.25em;
  margin-bottom: 0.25em;
  max-height: 90px;
  overflow: hidden;
`;

export default observer(React.forwardRef(DocumentListItem));
