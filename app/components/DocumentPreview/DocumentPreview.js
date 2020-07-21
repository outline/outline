// @flow
import * as React from "react";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { StarredIcon } from "outline-icons";
import styled, { withTheme } from "styled-components";
import Flex from "components/Flex";
import Badge from "components/Badge";
import Tooltip from "components/Tooltip";
import Highlight from "components/Highlight";
import PublishingInfo from "components/PublishingInfo";
import DocumentMenu from "menus/DocumentMenu";
import Document from "models/Document";

type Props = {
  document: Document,
  highlight?: ?string,
  context?: ?string,
  showCollection?: boolean,
  showPublished?: boolean,
  showPin?: boolean,
  showDraft?: boolean,
};

const StyledStar = withTheme(styled(({ solid, theme, ...props }) => (
  <StarredIcon color={theme.text} {...props} />
))`
  flex-shrink: 0;
  opacity: ${props => (props.solid ? "1 !important" : 0)};
  transition: all 100ms ease-in-out;

  &:hover {
    transform: scale(1.1);
  }
  &:active {
    transform: scale(0.95);
  }
`);

const StyledDocumentMenu = styled(DocumentMenu)`
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
  overflow: hidden;
  position: relative;

  ${StyledDocumentMenu} {
    opacity: 0;
  }

  &:hover,
  &:active,
  &:focus {
    background: ${props => props.theme.listItemHoverBackground};
    outline: none;

    ${StyledStar}, ${StyledDocumentMenu} {
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
  color: ${props => props.theme.text};
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
  color: ${props => props.theme.textTertiary};
  font-size: 14px;
  margin-top: -0.25em;
  margin-bottom: 0.25em;
`;

const SEARCH_RESULT_REGEX = /<b\b[^>]*>(.*?)<\/b>/gi;

@observer
class DocumentPreview extends React.Component<Props> {
  star = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    ev.stopPropagation();
    this.props.document.star();
  };

  unstar = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    ev.stopPropagation();
    this.props.document.unstar();
  };

  replaceResultMarks = (tag: string) => {
    // don't use SEARCH_RESULT_REGEX here as it causes
    // an infinite loop to trigger a regex inside it's own callback
    return tag.replace(/<b\b[^>]*>(.*?)<\/b>/gi, "$1");
  };

  render() {
    const {
      document,
      showCollection,
      showPublished,
      showPin,
      showDraft = true,
      highlight,
      context,
      ...rest
    } = this.props;

    const queryIsInTitle =
      !!highlight &&
      !!document.title.toLowerCase().includes(highlight.toLowerCase());

    return (
      <DocumentLink
        to={{
          pathname: document.url,
          state: { title: document.title },
        }}
        {...rest}
      >
        <Heading>
          <Title text={document.title || "Untitled"} highlight={highlight} />
          {!document.isDraft &&
            !document.isArchived && (
              <Actions>
                {document.isStarred ? (
                  <StyledStar onClick={this.unstar} solid />
                ) : (
                  <StyledStar onClick={this.star} />
                )}
              </Actions>
            )}
          {document.isDraft &&
            showDraft && (
              <Tooltip
                tooltip="Only visible to you"
                delay={500}
                placement="top"
              >
                <Badge>Draft</Badge>
              </Tooltip>
            )}
          <StyledDocumentMenu document={document} showPin={showPin} />
        </Heading>
        {!queryIsInTitle && (
          <ResultContext
            text={context}
            highlight={highlight ? SEARCH_RESULT_REGEX : undefined}
            processResult={this.replaceResultMarks}
          />
        )}
        <PublishingInfo
          document={document}
          showCollection={showCollection}
          showPublished={showPublished}
        />
      </DocumentLink>
    );
  }
}

export default DocumentPreview;
