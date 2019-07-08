// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import PublishingInfo from 'components/PublishingInfo';
import Document from 'models/Document';

type Props = {
  document: Document,
  anchor: string,
  showCollection?: boolean,
  ref?: *,
};

const DocumentLink = styled(Link)`
  display: block;
  margin: 2px -8px;
  padding: 6px 8px;
  border-radius: 8px;
  max-height: 50vh;
  min-width: 100%;
  overflow: hidden;
  position: relative;

  &:hover,
  &:active,
  &:focus {
    background: ${props => props.theme.listItemHoverBackground};
    outline: none;
  }
`;

const Title = styled.h3`
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  margin-top: 0;
  margin-bottom: 0.25em;
  white-space: nowrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
`;

@observer
class Backlink extends React.Component<Props> {
  render() {
    const { document, showCollection, anchor, ...rest } = this.props;

    return (
      <DocumentLink
        to={{
          pathname: document.url,
          hash: `d-${anchor}`,
          state: { title: document.title },
        }}
        {...rest}
      >
        <Title>{document.title}</Title>
        <PublishingInfo document={document} showCollection={showCollection} />
      </DocumentLink>
    );
  }
}

export default Backlink;
