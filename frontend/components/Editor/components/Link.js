// @flow
import React from 'react';
import { Link as InternalLink } from 'react-router-dom';
import type { Props } from '../types';

function getPathFromUrl(href: string) {
  if (href[0] === '/') return href;

  try {
    const parsed = new URL(href);
    return parsed.pathname;
  } catch (err) {
    return '';
  }
}

function isAtlasUrl(href: string) {
  if (href[0] === '/') return true;

  try {
    const atlas = new URL(BASE_URL);
    const parsed = new URL(href);
    return parsed.hostname === atlas.hostname;
  } catch (err) {
    return false;
  }
}

export default function Link({ attributes, node, children, readOnly }: Props) {
  const href = node.data.get('href');
  const path = getPathFromUrl(href);

  if (isAtlasUrl(href) && readOnly) {
    return <InternalLink {...attributes} to={path}>{children}</InternalLink>;
  } else {
    return <a {...attributes} href={href} target="_blank">{children}</a>;
  }
}
