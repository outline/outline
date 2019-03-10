// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import { GoToIcon } from 'outline-icons';
import Flex from 'shared/components/Flex';

import Document from 'models/Document';
import type { DocumentPath } from 'stores/CollectionsStore';

type Props = {
  result: DocumentPath,
  document?: Document,
  onSuccess?: *,
  ref?: *,
};

@observer
class PathToDocument extends React.Component<Props> {
  handleClick = async (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    const { document, result, onSuccess } = this.props;
    if (!document) return;

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

    if (onSuccess) onSuccess();
  };

  render() {
    const { result, document, ref } = this.props;
    const Component = document ? ResultWrapperLink : ResultWrapper;

    if (!result) return <div />;

    return (
      <Component ref={ref} onClick={this.handleClick} href="" selectable>
        {result.path
          .map(doc => <Title key={doc.id}>{doc.title}</Title>)
          .reduce((prev, curr) => [prev, <StyledGoToIcon />, curr])}
        {document && (
          <Flex>
            {' '}
            <StyledGoToIcon /> <Title>{document.title}</Title>
          </Flex>
        )}
      </Component>
    );
  }
}

const Title = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledGoToIcon = styled(GoToIcon)``;

const ResultWrapper = styled.div`
  display: flex;
  margin-bottom: 10px;

  color: ${props => props.theme.text};
  cursor: default;
`;

const ResultWrapperLink = styled(ResultWrapper.withComponent('a'))`
  height: 32px;
  padding-top: 3px;
  padding-left: 5px;

  &:hover,
  &:active,
  &:focus {
    margin-left: 0px;
    border-radius: 2px;
    background: ${props => props.theme.black};
    color: ${props => props.theme.smokeLight};
    outline: none;
    cursor: pointer;

    ${StyledGoToIcon} {
      fill: ${props => props.theme.white};
    }
  }
`;

export default PathToDocument;
