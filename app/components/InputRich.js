// @flow
import * as React from 'react';
import styled from 'styled-components';
import RichMarkdownEditor from 'rich-markdown-editor';
import { LabelText, Outline } from 'components/Input';

type Props = {
  label: string,
  minHeight?: number,
  maxHeight?: number,
};

export default function InputRich({
  label,
  minHeight,
  maxHeight,
  ...rest
}: Props) {
  return (
    <React.Fragment>
      <LabelText>{label}</LabelText>
      <StyledOutline maxHeight={maxHeight} minHeight={minHeight}>
        <RichMarkdownEditor {...rest} />
      </StyledOutline>
    </React.Fragment>
  );
}

const StyledOutline = styled(Outline)`
  padding: 8px 12px;
  min-height: ${({ minHeight }) => (minHeight ? `${minHeight}px` : '0')};
  max-height: ${({ maxHeight }) => (maxHeight ? `${maxHeight}px` : 'auto')};
  overflow: scroll;

  > * {
    display: block;
  }
`;
