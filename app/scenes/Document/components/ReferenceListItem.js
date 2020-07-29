// @flow
import * as React from "react";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import PublishingInfo from "components/PublishingInfo";
import Document from "models/Document";
import type { NavigationNode } from "types";

type Props = {
  document: Document | NavigationNode,
  anchor?: string,
  showCollection?: boolean,
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
  color: ${props => props.theme.text};
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
`;

@observer
class ReferenceListItem extends React.Component<Props> {
  render() {
    const { document, showCollection, anchor, ...rest } = this.props;

    return (
      <DocumentLink
        to={{
          pathname: document.url,
          hash: anchor ? `d-${anchor}` : undefined,
          state: { title: document.title },
        }}
        {...rest}
      >
        <Title>{document.title}</Title>
        {document.updatedBy && (
          <PublishingInfo document={document} showCollection={showCollection} />
        )}
      </DocumentLink>
    );
  }
}

export default ReferenceListItem;
