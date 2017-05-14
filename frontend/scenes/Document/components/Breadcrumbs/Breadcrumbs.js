// @flow
import React from 'react';
import { Link } from 'react-router';
import type { Document, NavigationNode } from 'types';

type Props = {
  document: Document,
  pathToDocument: Array<NavigationNode>,
};

const Breadcrumbs = ({ document, pathToDocument }: Props) => {
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
        &nbsp;/&nbsp;
        {titleSections.reduce((prev, curr) => [prev, ' / ', curr])}
        {` / ${document.title}`}
      </span>
    );
  }
  return null;
};

export default Breadcrumbs;
