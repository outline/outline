// @flow
import React from 'react';
import { observer } from 'mobx-react';
import invariant from 'invariant';
import _ from 'lodash';
import styled from 'styled-components';
import { color } from 'styles/constants';

import Flex from 'components/Flex';
import ChevronIcon from 'components/Icon/ChevronIcon';

import Document from 'models/Document';

const ResultWrapper = styled.div`
  display: flex;
  margin-bottom: 10px;

  color: ${color.text};
  cursor: default;
`;

const StyledChevronIcon = styled(ChevronIcon)`
  padding-top: 2px;
  width: 24px;
  height: 24px; 
`;

const ResultWrapperLink = ResultWrapper.withComponent('a').extend`
  height: 32px;
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

    ${StyledChevronIcon} svg {
      fill: ${color.smokeLight};
    }
  }
`;

type Props = {
  result: Object,
  document?: Document,
  onSuccess?: Function,
  ref?: Function,
};

@observer class PathToDocument extends React.Component {
  props: Props;

  handleClick = async (ev: SyntheticEvent) => {
    ev.preventDefault();
    const { document, result, onSuccess } = this.props;

    invariant(onSuccess && document, 'onSuccess unavailable');

    if (result.type === 'document') {
      await document.move(result.id);
    } else if (
      result.type === 'collection' &&
      result.id === document.collection.id
    ) {
      await document.move(null);
    } else {
      throw new Error('Not implemented yet');
    }
    onSuccess();
  };

  render() {
    const { result, document, ref } = this.props;
    const Component = document ? ResultWrapperLink : ResultWrapper;

    if (!result) return <div />;

    return (
      <Component innerRef={ref} selectable href onClick={this.handleClick}>
        {result.path
          .map(doc => <span key={doc.id}>{doc.title}</span>)
          .reduce((prev, curr) => [prev, <StyledChevronIcon />, curr])}
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
