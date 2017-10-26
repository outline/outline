// @flow
import React from 'react';
import styled from 'styled-components';
import { fontWeight, color } from 'styles/constants';
import Document from 'models/Document';
import NextIcon from 'components/Icon/NextIcon';

type Props = {
  innerRef?: Function,
  onClick: SyntheticEvent => void,
  document: Document,
};

function DocumentResult({ document, ...rest }: Props) {
  return (
    <ListItem {...rest} href="">
      <i><NextIcon light /></i>
      {document.title}
    </ListItem>
  );
}

const ListItem = styled.a`
  display: flex;
  align-items: center;
  height: 24px;
  padding: 4px 8px 4px 0;
  color: ${color.white};
  font-size: 15px;

  i {
    visibility: hidden;
  }

  &:hover,
  &:focus,
  &:active {
    font-weight: ${fontWeight.medium};
    outline: none;

    i {
      visibility: visible;
    }
  }
`;

export default DocumentResult;
