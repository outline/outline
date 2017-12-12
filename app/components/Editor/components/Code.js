// @flow
import React from 'react';
import styled from 'styled-components';
import type { SlateNodeProps } from '../types';
import CopyButton from './CopyButton';
import { color } from 'shared/styles/constants';

export default function Code({
  children,
  node,
  readOnly,
  attributes,
}: SlateNodeProps) {
  const language = node.data.get('language') || 'javascript';

  return (
    <Container {...attributes} spellCheck={false}>
      {readOnly && <CopyButton text={node.text} />}
      <Pre className={`language-${language}`}>
        <code className={`language-${language}`}>{children}</code>
      </Pre>
    </Container>
  );
}

const Pre = styled.pre`
  padding: 0.5em 1em;
  background: ${color.smokeLight};
  border-radius: 4px;
  border: 1px solid ${color.smokeDark};

  code {
    padding: 0;
  }
`;

const Container = styled.div`
  position: relative;

  &:hover {
    > span {
      opacity: 1;
    }
  }
`;
