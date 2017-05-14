// @flow
import React from 'react';
import { Link } from 'react-router';
import DocumentSceneStore from '../../DocumentSceneStore';

type Props = {
  store: DocumentSceneStore,
};

const Breadcrumbs = ({ store }: Props) => {
  const { document, pathToDocument } = store;
  if (document && document.collection) {
    const titleSections = pathToDocument
      ? pathToDocument.map(node => (
          <Link key={node.id} to={node.url}>{node.title}</Link>
        ))
      : [];
    titleSections.unshift(
      <Link key={document.collection.id} to={document.collection.url}>
        {document.collection.name}
      </Link>
    );

    return (
      <span>
        {titleSections.reduce((prev, curr) => [prev, ' / ', curr])}
        {` / ${document.title}`}
      </span>
    );
  }
};

export default Breadcrumbs;
