// @flow
import React, { Component } from 'react';
import { toJS } from 'mobx';
import { Link } from 'react-router-dom';
import type { Document } from 'types';
import styled from 'styled-components';
import { color } from 'styles/constants';
import Markdown from 'components/Markdown';
import PublishingInfo from 'components/PublishingInfo';

type Props = {
  document: Document,
  innerRef?: Function,
};

const DocumentLink = styled(Link)`
  display: block;
  margin: 16px -16px;
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

  h1 {
    margin-top: 0;
  }
`;

// $FlowIssue
const TruncatedMarkdown = styled(Markdown)`
  pointer-events: none;
`;

class DocumentPreview extends Component {
  props: Props;

  render() {
    const { document, innerRef, ...rest } = this.props;

    return (
      <DocumentLink to={document.url} innerRef={innerRef} {...rest}>
        <PublishingInfo
          createdAt={document.createdAt}
          createdBy={document.createdBy}
          updatedAt={document.updatedAt}
          updatedBy={document.updatedBy}
          collaborators={toJS(document.collaborators)}
        />
        <TruncatedMarkdown text={document.text} limit={150} />
      </DocumentLink>
    );
  }
}

export default DocumentPreview;
