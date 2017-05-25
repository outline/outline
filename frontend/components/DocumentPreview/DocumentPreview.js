// @flow
import React from 'react';
import { toJS } from 'mobx';
import { Link } from 'react-router-dom';
import type { Document } from 'types';
import styled from 'styled-components';
import PublishingInfo from 'components/PublishingInfo';
import Markdown from 'components/Markdown';

type Props = {
  document: Document,
};

const Container = styled.div`
  width: 100%;
  padding: 20px 0;
`;

const DocumentPreview = ({ document }: Props) => {
  return (
    <Container>
      <PublishingInfo
        createdAt={document.createdAt}
        createdBy={document.createdBy}
        updatedAt={document.updatedAt}
        updatedBy={document.updatedBy}
        collaborators={toJS(document.collaborators)}
      />
      <Link to={document.url}>
        <h2>{document.title}</h2>
      </Link>
      <Markdown text={document.text.substring(0, 300)} />
      <div>
        <Link to={document.url}>
          Continue reading…
        </Link>
      </div>
    </Container>
  );
};

export default DocumentPreview;
