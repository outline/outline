// @flow
import React from 'react';
import styled from 'styled-components';
import CopyButton from './CopyButton';
import type { Props } from '../types';

export default function Code({ children, node, readOnly, attributes }: Props) {
  return (
    <Container>
      {readOnly && <CopyButton text={node.text} />}
      <pre>
        <code {...attributes}>
          {children}
        </code>
      </pre>
    </Container>
  );
}

const Container = styled.div`
  position: relative;
`;
