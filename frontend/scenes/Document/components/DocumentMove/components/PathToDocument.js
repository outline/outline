// @flow
import React from 'react';
import { observer } from 'mobx-react';
import _ from 'lodash';
import invariant from 'invariant';
import styled from 'styled-components';
import { color } from 'styles/constants';

import Flex from 'components/Flex';
import ChevronIcon from 'components/Icon/ChevronIcon';

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
  document: Document,
  onClick?: Function,
  ref?: Function,
};

@observer class PathToDocument extends React.Component {
  props: Props;

  render() {
    const { result, document, onClick, ref } = this.props;
    // $FlowIssue we'll always have a document
    const Component = onClick ? ResultWrapperLink : ResultWrapper;

    if (!result) return <div/>;

    return (
      <Component
        innerRef={ref}
        selectable
        href
        onClick={onClick}
      >
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
