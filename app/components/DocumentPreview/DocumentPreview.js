// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import { Link } from 'react-router-dom';
import Document from 'models/Document';
import styled, { withTheme } from 'styled-components';
import Flex from 'shared/components/Flex';
import Highlight from 'components/Highlight';
import { StarredIcon } from 'outline-icons';
import PublishingInfo from './components/PublishingInfo';
import DocumentMenu from 'menus/DocumentMenu';

type Props = {
  document: Document,
  highlight?: ?string,
  showCollection?: boolean,
  innerRef?: *,
};

const StyledStar = withTheme(styled(({ solid, theme, ...props }) => (
  <StarredIcon color={solid ? theme.black : theme.text} {...props} />
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
    background: ${props => props.theme.smokeLight};
    border: 2px solid ${props => props.theme.smoke};
    outline: none;

    ${StyledStar}, ${StyledDocumentMenu} {
      opacity: 0.5;

      &:hover {
        opacity: 1;
      }
    }
  }

  &:focus {
    border: 2px solid ${props => props.theme.slateDark};
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

  render() {
    const {
      document,
      showCollection,
      innerRef,
      highlight,
      ...rest
    } = this.props;

    return (
      <DocumentLink
        to={{
          pathname: document.url,
          state: { title: document.title },
        }}
        innerRef={innerRef}
        {...rest}
      >
        <Heading>
          <Title text={document.title} highlight={highlight} />
          {document.publishedAt && (
            <Actions>
              {document.starred ? (
                <StyledStar onClick={this.unstar} solid />
              ) : (
                <StyledStar onClick={this.star} />
              )}
            </Actions>
          )}
          <StyledDocumentMenu document={document} />
        </Heading>
        <PublishingInfo
          document={document}
          collection={showCollection ? document.collection : undefined}
        />
      </DocumentLink>
    );
  }
}

export default DocumentPreview;
