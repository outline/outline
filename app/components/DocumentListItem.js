// @flow
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Document from "models/Document";
import Badge from "components/Badge";
import Button from "components/Button";
import DocumentMeta from "components/DocumentMeta";
import EventBoundary from "components/EventBoundary";
import Flex from "components/Flex";
import Highlight from "components/Highlight";
import StarButton, { AnimatedStar } from "components/Star";
import Tooltip from "components/Tooltip";
import useCurrentTeam from "hooks/useCurrentTeam";
import useCurrentUser from "hooks/useCurrentUser";
import useStores from "hooks/useStores";
import DocumentMenu from "menus/DocumentMenu";
import { newDocumentUrl } from "utils/routeHelpers";

type Props = {|
  document: Document,
  highlight?: ?string,
  context?: ?string,
  showNestedDocuments?: boolean,
  showCollection?: boolean,
  showPublished?: boolean,
  showPin?: boolean,
  showDraft?: boolean,
  showTemplate?: boolean,
|};

const SEARCH_RESULT_REGEX = /<b\b[^>]*>(.*?)<\/b>/gi;

function replaceResultMarks(tag: string) {
  // don't use SEARCH_RESULT_REGEX here as it causes
  // an infinite loop to trigger a regex inside it's own callback
  return tag.replace(/<b\b[^>]*>(.*?)<\/b>/gi, "$1");
}

function DocumentListItem(props: Props) {
  const { t } = useTranslation();
  const { policies } = useStores();
  const currentUser = useCurrentUser();
  const currentTeam = useCurrentTeam();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const {
    document,
    showNestedDocuments,
    showCollection,
    showPublished,
    showPin,
    showDraft = true,
    showTemplate,
    highlight,
    context,
  } = props;

  const queryIsInTitle =
    !!highlight &&
    !!document.title.toLowerCase().includes(highlight.toLowerCase());
  const canStar =
    !document.isDraft && !document.isArchived && !document.isTemplate;
  const can = policies.abilities(currentTeam.id);

  return (
    <DocumentLink
      $isStarred={document.isStarred}
      $menuOpen={menuOpen}
      to={{
        pathname: document.url,
        state: { title: document.titleWithDefault },
      }}
    >
      <Content>
        <Heading>
          <Title text={document.titleWithDefault} highlight={highlight} />
          {document.isNew && document.createdBy.id !== currentUser.id && (
            <Badge yellow>{t("New")}</Badge>
          )}
          {canStar && (
            <StarPositioner>
              <StarButton document={document} />
            </StarPositioner>
          )}
          {document.isDraft && showDraft && (
            <Tooltip
              tooltip={t("Only visible to you")}
              delay={500}
              placement="top"
            >
              <Badge>{t("Draft")}</Badge>
            </Tooltip>
          )}
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
          showNestedDocuments={showNestedDocuments}
          showLastViewed
        />
      </Content>
      <Actions>
        {document.isTemplate &&
          !document.isArchived &&
          !document.isDeleted &&
          can.createDocument && (
            <>
              <Button
                as={Link}
                to={newDocumentUrl(document.collectionId, {
                  templateId: document.id,
                })}
                icon={<PlusIcon />}
                neutral
              >
                {t("New doc")}
              </Button>
              &nbsp;
            </>
          )}
        <DocumentMenu
          document={document}
          showPin={showPin}
          onOpen={() => setMenuOpen(true)}
          onClose={() => setMenuOpen(false)}
          modal={false}
        />
      </Actions>
    </DocumentLink>
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

  ${breakpoint("tablet")`
    display: flex;
  `};
`;

const DocumentLink = styled(Link)`
  display: flex;
  align-items: center;
  margin: 10px -8px;
  padding: 6px 8px;
  border-radius: 8px;
  max-height: 50vh;
  width: calc(100vw - 8px);

  ${breakpoint("tablet")`
    width: auto;
  `};

  ${Actions} {
    opacity: 0;
  }

  ${AnimatedStar} {
    opacity: ${(props) => (props.$isStarred ? "1 !important" : 0)};
  }

  &:hover,
  &:active,
  &:focus,
  &:focus-within {
    background: ${(props) => props.theme.listItemHoverBackground};

    ${Actions} {
      opacity: 1;
    }

    ${AnimatedStar} {
      opacity: 0.5;

      &:hover {
        opacity: 1;
      }
    }
  }

  ${(props) =>
    props.$menuOpen &&
    css`
      background: ${(props) => props.theme.listItemHoverBackground};

      ${Actions} {
        opacity: 1;
      }

      ${AnimatedStar} {
        opacity: 0.5;
      }
    `}
`;

const Heading = styled.h3`
  display: flex;
  align-items: center;
  height: 24px;
  margin-top: 0;
  margin-bottom: 0.25em;
  overflow: hidden;
  white-space: nowrap;
  color: ${(props) => props.theme.text};
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
`;

const StarPositioner = styled(Flex)`
  margin-left: 4px;
  align-items: center;
`;

const Title = styled(Highlight)`
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ResultContext = styled(Highlight)`
  display: block;
  color: ${(props) => props.theme.textTertiary};
  font-size: 14px;
  margin-top: -0.25em;
  margin-bottom: 0.25em;
`;

export default observer(DocumentListItem);
