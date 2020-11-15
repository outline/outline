// @flow
import { observable } from "mobx";
import { observer } from "mobx-react";
import { StarredIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import { withTranslation, type TFunction } from "react-i18next";
import { Link, Redirect } from "react-router-dom";
import styled, { withTheme } from "styled-components";
import Document from "models/Document";
import Badge from "components/Badge";
import Button from "components/Button";
import DocumentMeta from "components/DocumentMeta";
import EventBoundary from "components/EventBoundary";
import Flex from "components/Flex";
import Highlight from "components/Highlight";
import Tooltip from "components/Tooltip";
import DocumentMenu from "menus/DocumentMenu";
import { newDocumentUrl } from "utils/routeHelpers";

type Props = {
  document: Document,
  highlight?: ?string,
  context?: ?string,
  showCollection?: boolean,
  showPublished?: boolean,
  showPin?: boolean,
  showDraft?: boolean,
  showTemplate?: boolean,
  t: TFunction,
};

const SEARCH_RESULT_REGEX = /<b\b[^>]*>(.*?)<\/b>/gi;

@observer
class DocumentPreview extends React.Component<Props> {
  @observable redirectTo: ?string;

  handleStar = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    ev.stopPropagation();
    this.props.document.star();
  };

  handleUnstar = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    ev.stopPropagation();
    this.props.document.unstar();
  };

  replaceResultMarks = (tag: string) => {
    // don't use SEARCH_RESULT_REGEX here as it causes
    // an infinite loop to trigger a regex inside it's own callback
    return tag.replace(/<b\b[^>]*>(.*?)<\/b>/gi, "$1");
  };

  handleNewFromTemplate = (event: SyntheticEvent<>) => {
    event.preventDefault();
    event.stopPropagation();

    const { document } = this.props;

    this.redirectTo = newDocumentUrl(document.collectionId, {
      templateId: document.id,
    });
  };

  render() {
    const {
      document,
      showCollection,
      showPublished,
      showPin,
      showDraft = true,
      showTemplate,
      highlight,
      context,
      t,
    } = this.props;

    if (this.redirectTo) {
      return <Redirect to={this.redirectTo} push />;
    }

    const queryIsInTitle =
      !!highlight &&
      !!document.title.toLowerCase().includes(highlight.toLowerCase());

    return (
      <DocumentLink
        to={{
          pathname: document.url,
          state: { title: document.titleWithDefault },
        }}
      >
        <Heading>
          <Title text={document.titleWithDefault} highlight={highlight} />
          {document.isNew && <Badge yellow>{t("New")}</Badge>}
          {!document.isDraft &&
            !document.isArchived &&
            !document.isTemplate && (
              <Actions>
                {document.isStarred ? (
                  <StyledStar onClick={this.handleUnstar} solid />
                ) : (
                  <StyledStar onClick={this.handleStar} />
                )}
              </Actions>
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
          <SecondaryActions>
            {document.isTemplate &&
              !document.isArchived &&
              !document.isDeleted && (
                <Button
                  onClick={this.handleNewFromTemplate}
                  icon={<PlusIcon />}
                  neutral
                >
                  {t("New doc")}
                </Button>
              )}
            &nbsp;
            <EventBoundary>
              <DocumentMenu document={document} showPin={showPin} />
            </EventBoundary>
          </SecondaryActions>
        </Heading>

        {!queryIsInTitle && (
          <ResultContext
            text={context}
            highlight={highlight ? SEARCH_RESULT_REGEX : undefined}
            processResult={this.replaceResultMarks}
          />
        )}
        <DocumentMeta
          document={document}
          showCollection={showCollection}
          showPublished={showPublished}
          showLastViewed
        />
      </DocumentLink>
    );
  }
}

const StyledStar = withTheme(styled(({ solid, theme, ...props }) => (
  <StarredIcon color={theme.text} {...props} />
))`
  flex-shrink: 0;
  opacity: ${(props) => (props.solid ? "1 !important" : 0)};
  transition: all 100ms ease-in-out;

  &:hover {
    transform: scale(1.1);
  }
  &:active {
    transform: scale(0.95);
  }
`);

const SecondaryActions = styled(Flex)`
  align-items: center;
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
`;

const DocumentLink = styled(Link)`
  display: block;
  margin: 10px -8px;
  padding: 6px 8px;
  border-radius: 8px;
  max-height: 50vh;
  min-width: 100%;
  max-width: calc(100vw - 40px);
  overflow: hidden;
  position: relative;

  ${SecondaryActions} {
    opacity: 0;
  }

  &:hover,
  &:active,
  &:focus {
    background: ${(props) => props.theme.listItemHoverBackground};

    ${SecondaryActions} {
      opacity: 1;
    }

    ${StyledStar} {
      opacity: 0.5;

      &:hover {
        opacity: 1;
      }
    }
  }
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

const Actions = styled(Flex)`
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

export default withTranslation()<DocumentPreview>(DocumentPreview);
