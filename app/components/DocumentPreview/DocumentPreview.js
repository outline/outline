// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import { Link } from 'react-router-dom';
import Document from 'models/Document';
import styled, { withTheme } from 'styled-components';
import { darken } from 'polished';
import Flex from 'shared/components/Flex';
import Highlight from 'components/Highlight';
import { StarredIcon } from 'outline-icons';
import PublishingInfo from './components/PublishingInfo';
import DocumentMenu from 'menus/DocumentMenu';

type Props = {
  document: Document,
  highlight?: ?string,
  context?: ?string,
  showCollection?: boolean,
  showPublished?: boolean,
  showPin?: boolean,
  link?: boolean,
  ref?: *,
};

const StyledStar = withTheme(styled(({ solid, theme, ...props }) => (
  <StarredIcon color={theme.text} {...props} />
))`
  flex-shrink: 0;
  opacity: ${props => (props.solid ? '1 !important' : 0)};
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
  margin: 0 -16px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 2px solid transparent;
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
    border: 2px solid ${props => props.theme.listItemHoverBorder};
    outline: none;

    ${StyledStar}, ${StyledDocumentMenu} {
      opacity: 0.5;

      &:hover {
        opacity: 1;
      }
    }
  }

  &:focus {
    border: 2px solid ${props => darken(0.5, props.theme.listItemHoverBorder)};
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
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
  star = (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    ev.stopPropagation();
    this.props.document.star();
  };

  unstar = (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    ev.stopPropagation();
    this.props.document.unstar();
  };

  replaceResultMarks = (tag: string) => {
    // don't use SEARCH_RESULT_REGEX here as it causes
    // an infinite loop to trigger a regex inside it's own callback
    return tag.replace(/<b\b[^>]*>(.*?)<\/b>/gi, '$1');
  };

  render() {
    const {
      document,
      showCollection,
      showPublished,
      showPin,
      highlight,
      context,
      link,
      ...rest
    } = this.props;

    const queryIsInTitle =
      !!highlight &&
      !!document.title.toLowerCase().match(highlight.toLowerCase());

    return (
      <DocumentLink
        as={link === false ? 'div' : undefined}
        to={
          link === false
            ? undefined
            : {
                pathname: document.url,
                state: { title: document.title },
              }
        }
        {...rest}
      >
        <Heading>
          <Title text={document.title} highlight={highlight} />
          {!document.isDraft &&
            !document.isArchived && (
              <Actions>
                {document.starred ? (
                  <StyledStar onClick={this.unstar} solid />
                ) : (
                  <StyledStar onClick={this.star} />
                )}
              </Actions>
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
          collection={showCollection ? document.collection : undefined}
          showPublished={showPublished}
        />
      </DocumentLink>
    );
  }
}

export default DocumentPreview;
