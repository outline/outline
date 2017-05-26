// @flow
import React from 'react';
import { toJS } from 'mobx';
import { Link } from 'react-router-dom';
import type { Document } from 'types';
import styled from 'styled-components';
import { color } from 'styles/constants';
import PublishingInfo from 'components/PublishingInfo';
import Markdown from 'components/Markdown';

type Props = {
  document: Document,
};

const Container = styled.div`
  width: 100%;
  padding: 20px 0;
`;

const DocumentLink = styled(Link)`
  display: block;
  margin: -16px;
  padding: 16px;
  border-radius: 8px;

  h1 {
    margin-top: 0;
  }

  &:hover {
    background: ${color.smokeLight};
  }
`;

const StyledMarkdown = styled(Markdown)`
  pointer-events: none;
`;

const DocumentPreview = ({ document }: Props) => {
  return (
    <Container>
      <DocumentLink to={document.url}>
        <PublishingInfo
          createdAt={document.createdAt}
          createdBy={document.createdBy}
          updatedAt={document.updatedAt}
          updatedBy={document.updatedBy}
          collaborators={toJS(document.collaborators)}
        />
        <StyledMarkdown text={document.text} limit={150} />
      </DocumentLink>
    </Container>
  );
};

export default DocumentPreview;
