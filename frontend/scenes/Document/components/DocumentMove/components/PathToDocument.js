// @flow
import React from 'react';
import { observer } from 'mobx-react';
import _ from 'lodash';
import invariant from 'invariant';
import styled from 'styled-components';
import { color } from 'styles/constants';

import Flex from 'components/Flex';
import ChevronIcon from 'components/Icon/ChevronIcon';

import Document from 'models/Document';
import DocumentsStore from 'stores/DocumentsStore';

const ResultWrapper = styled.div`
display: flex;
margin-bottom: 10px;

color: ${color.text};
cursor: default;
`;

const ResultWrapperLink = ResultWrapper.withComponent('a').extend`
padding-top: 3px;
padding-left: 5px;

&:hover,
&:active,
&:focus {
  margin-left: 0px;
  border-radius: 2px;
  background: ${color.black};
  color: ${color.smokeLight};
  outline: none;
  cursor: pointer;
}
`;

type Props = {
  documentId?: string,
  onSuccess?: Function,
  documents: DocumentsStore,
  document?: Document,
  ref?: Function,
  selectable?: boolean,
};

@observer class PathToDocument extends React.Component {
  props: Props;

  get resultDocument(): ?Document {
    const { documentId } = this.props;
    if (documentId) return this.props.documents.getById(documentId);
  }

  handleSelect = async (event: SyntheticEvent) => {
    const { document, onSuccess } = this.props;

    invariant(onSuccess && document, 'onSuccess unavailable');
    event.preventDefault();
    await document.move(this.resultDocument ? this.resultDocument.id : null);
    onSuccess();
  };

  render() {
    const { document, onSuccess, ref } = this.props;
    // $FlowIssue we'll always have a document
    const { collection } = document || this.resultDocument;
    const Component = onSuccess ? ResultWrapperLink : ResultWrapper;

    return (
      <Component
        innerRef={ref}
        selectable
        href={!!onSuccess}
        onClick={onSuccess && this.handleSelect}
      >
        {collection.name}
        {this.resultDocument &&
          <Flex>
            {' '}
            <ChevronIcon />
            {' '}
            {this.resultDocument.pathToDocument
              .map(doc => <span key={doc.id}>{doc.title}</span>)
              .reduce((prev, curr) => [prev, <ChevronIcon />, curr])}
          </Flex>}
        {document &&
          <Flex>
            {' '}
            <ChevronIcon />
            {' '}{document.title}
          </Flex>}
      </Component>
    );
  }
}

export default PathToDocument;
