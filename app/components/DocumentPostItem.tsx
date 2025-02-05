import {
  useFocusEffect,
  useRovingTabIndex,
} from "@getoutline/react-roving-tabindex";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import EventBoundary from "@shared/components/EventBoundary";
import Icon from "@shared/components/Icon";
import { richExtensions, withComments } from "@shared/editor/nodes";
import { s, hover } from "@shared/styles";
import Document from "~/models/Document";
import Badge from "~/components/Badge";
import Flex from "~/components/Flex";
import Highlight from "~/components/Highlight";
import NudeButton from "~/components/NudeButton";
import StarButton from "~/components/Star";
import Tooltip from "~/components/Tooltip";
import useBoolean from "~/hooks/useBoolean";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import DocumentMenu from "~/menus/DocumentMenu";
import { documentPath } from "~/utils/routeHelpers";
import { Avatar, AvatarSize } from "./Avatar";
import Editor from "./Editor";
import { determineSidebarContext } from "./Sidebar/components/SidebarContext";
import Text from "./Text";
import Time from "./Time";

const extensions = withComments(richExtensions);

type Props = {
  document: Document;
  highlight?: string | undefined;
  context?: string | undefined;
  showParentDocuments?: boolean;
  showCollection?: boolean;
  showPublished?: boolean;
  showPin?: boolean;
  showDraft?: boolean;
};

function DocumentPostItem(
  props: Props,
  ref: React.RefObject<HTMLAnchorElement>
) {
  const { t } = useTranslation();
  const user = useCurrentUser();
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
    showPin,
    showDraft = true,
    highlight,
    context,
    ...rest
  } = props;
  const canStar = !document.isArchived && !document.isTemplate;

  const sidebarContext = determineSidebarContext({
    document,
    user,
    currentContext: locationSidebarContext,
  });

  return (
    <Post
      ref={itemRef}
      dir={document.dir}
      role="menuitem"
      $isStarred={document.isStarred}
      $menuOpen={menuOpen}
      {...rest}
      {...rovingTabIndex}
    >
      <Content>
        <Heading
          dir={document.dir}
          to={{
            pathname: documentPath(document),
            state: {
              title: document.titleWithDefault,
              sidebarContext,
            },
          }}
        >
          {document.icon && (
            <>
              <Icon value={document.icon} color={document.color ?? undefined} />
              &nbsp;
            </>
          )}
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
          {canStar && (
            <StarPositioner>
              <StarButton document={document} />
            </StarPositioner>
          )}
          <Actions>
            <DocumentMenu
              document={document}
              showPin={showPin}
              onOpen={handleMenuOpen}
              onClose={handleMenuClose}
              modal={false}
            />
          </Actions>
        </Heading>

        <Flex justify="space-between" style={{ marginBottom: 8 }}>
          <Flex gap={6} align="center">
            <Avatar model={document.createdBy} size={AvatarSize.Medium} />
            <Text type="secondary" size="small">
              {t("By {{ author }}", { author: document.createdBy?.name })}{" "}
              <Time dateTime={document.updatedAt} addSuffix />
            </Text>
          </Flex>
        </Flex>

        <Editor defaultValue={document.data} extensions={extensions} readOnly />
      </Content>
    </Post>
  );
}

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

  ${NudeButton} {
    &: ${hover}, &[aria-expanded= "true"] {
      background: ${s("sidebarControlHoverBackground")};
    }
  }

  ${breakpoint("tablet")`
    display: flex;
  `};
`;

const Post = styled.div<{
  $isStarred?: boolean;
  $menuOpen?: boolean;
}>`
  position: relative;
  margin-top: 10px;
  margin-bottom: 2em;
  padding: 6px 0;
`;

const Heading = styled(Link)<{ rtl?: boolean }>`
  display: flex;
  justify-content: ${(props) => (props.rtl ? "flex-end" : "flex-start")};
  align-items: center;
  margin-top: 8px;
  margin-bottom: -4px;
  white-space: nowrap;
  color: ${s("text")};
  font-size: 20px;
  font-family: ${s("fontFamily")};
  font-weight: 500;
  width: 100%;
`;

const StarPositioner = styled(Flex)`
  margin-left: 4px;
  align-items: center;
`;

const Title = styled(Highlight)`
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;

  &: ${hover} {
    text-decoration: underline;
  }
`;

export default observer(React.forwardRef(DocumentPostItem));
