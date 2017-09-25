// @flow
import React from 'react';
import styled from 'styled-components';
import Document from 'models/Document';
import Icon from 'components/Icon';

type Props = {
  innerRef?: Function,
  onClick: SyntheticEvent => void,
  document: Document,
};

function DocumentResult({ document, ...rest }: Props) {
  return (
    <ListItem {...rest} href="">
      <i><Icon type="ChevronRight" light /></i>
      {document.title}
    </ListItem>
  );
}

const ListItem = styled.a`
  display: flex;
  align-items: center;
  height: 24px;
  padding: 4px 8px 4px 0;
  color: #fff;
  font-size: 15px;

  i {
    visibility: hidden;
  }

  &:hover,
  &:focus,
  &:active {
    font-weight: 500;
    outline: none;

    i {
      visibility: visible;
    }
  }
`;

export default DocumentResult;
