// @flow
import React from 'react';
import styled from 'styled-components';
import type { SlateNodeProps } from '../types';
import CopyButton from './CopyButton';
import { color } from 'shared/styles/constants';

function getCopyText(node) {
  return node.nodes.reduce((memo, line) => `${memo}${line.text}\n`, '');
}

export default function Code({
  children,
  node,
  readOnly,
  attributes,
}: SlateNodeProps) {
  // TODO: There is a currently a bug in slate-prism that prevents code elements
  // with a language class name from formatting correctly on first load.
  // const language = node.data.get('language') || 'javascript';

  return (
    <Container {...attributes} spellCheck={false}>
      {readOnly && <CopyButton text={getCopyText(node)} />}
      <code>{children}</code>
    </Container>
  );
}

const Container = styled.div`
  position: relative;
  background: ${color.smokeLight};
  border-radius: 4px;
  border: 1px solid ${color.smokeDark};

  code {
    display: block;
    overflow-x: scroll;
    padding: 0.5em 1em;
    line-height: 1.4em;
  }

  pre {
    margin: 0;
  }

  &:hover {
    > span {
      opacity: 1;
    }
  }
`;
