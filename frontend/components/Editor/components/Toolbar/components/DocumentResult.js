// @flow
import React from 'react';
import styled from 'styled-components';
import Document from 'models/Document';

type Props = {
  onClick: SyntheticEvent => void,
  document: Document,
};

function DocumentResult({ document, onClick }: Props) {
  return (
    <ListItem>
      <a onClick={onClick}>
        {document.title}
      </a>
    </ListItem>
  );
}

const ListItem = styled.li`
  height: 18px;
  padding: 8px;

  a {
    color: #fff;
    font-size: 15px;
  }

  &:hover {
    text-decoration:underline;
  }
`;

export default DocumentResult;
