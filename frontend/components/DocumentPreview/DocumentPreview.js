// @flow
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import Document from 'models/Document';
import styled from 'styled-components';
import { color } from 'styles/constants';
import PublishingInfo from 'components/PublishingInfo';

type Props = {
  document: Document,
  highlight?: ?string,
  innerRef?: Function,
};

const DocumentLink = styled(Link)`
  display: block;
  margin: 0 -16px;
  padding: 16px;
  border-radius: 8px;
  border: 2px solid transparent;
  max-height: 50vh;
  min-width: 100%;
  overflow: hidden;

  &:hover,
  &:active,
  &:focus {
    background: ${color.smokeLight};
    border: 2px solid ${color.smoke};
    outline: none;
  }

  &:focus {
    border: 2px solid ${color.slateDark};
  }

  h3 {
    margin-top: 0;
  }
`;

class DocumentPreview extends Component {
  props: Props;

  render() {
    const { document, innerRef, ...rest } = this.props;

    return (
      <DocumentLink to={document.url} innerRef={innerRef} {...rest}>
        <h3>{document.title}</h3>
        <PublishingInfo
          createdAt={document.createdAt}
          createdBy={document.createdBy}
          updatedAt={document.updatedAt}
          updatedBy={document.updatedBy}
        />
      </DocumentLink>
    );
  }
}

export default DocumentPreview;
