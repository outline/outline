// @flow
import React from 'react';
import { Document } from 'slate';
import styled from 'styled-components';
import headingToSlug from '../headingToSlug';
import type { Node, Editor } from '../types';
import Placeholder from './Placeholder';

type Props = {
  children: React$Element<*>,
  placeholder?: boolean,
  parent: Node,
  node: Node,
  editor: Editor,
  readOnly: boolean,
  component?: string,
};

function Heading(props: Props) {
  const {
    parent,
    placeholder,
    node,
    editor,
    readOnly,
    children,
    component = 'h1',
    ...rest
  } = props;
  const parentIsDocument = parent instanceof Document;
  const firstHeading = parentIsDocument && parent.nodes.first() === node;
  const showPlaceholder = placeholder && firstHeading && !node.text;
  const slugish = headingToSlug(node);
  const showHash = readOnly && !!slugish;
  const Component = component;
  const emoji = editor.props.emoji || '';
  const title = node.text.trim();
  const startsWithEmojiAndSpace =
    emoji && title.match(new RegExp(`^${emoji}\\s`));

  return (
    <Component {...rest} id={slugish}>
      <Wrapper hasEmoji={startsWithEmojiAndSpace}>
        {children}
      </Wrapper>
      {showPlaceholder &&
        <Placeholder contentEditable={false}>
          {editor.props.placeholder}
        </Placeholder>}
      {showHash && <Anchor name={slugish} href={`#${slugish}`}>#</Anchor>}
    </Component>
  );
}

const Wrapper = styled.div`
  display: inline;
  margin-left: ${(props: Props) => (props.hasEmoji ? '-1.2em' : 0)}
`;

const Anchor = styled.a`
  visibility: hidden;
  padding-left: .25em;
  color: #dedede;

  &:hover {
    color: #cdcdcd;
  }
`;

export const StyledHeading = styled(Heading)`
  position: relative;

  &:hover {
    ${Anchor} {
      visibility: visible;
      text-decoration: none;
    }
  }
`;
export const Heading1 = (props: Props) => (
  <StyledHeading component="h1" {...props} />
);
export const Heading2 = (props: Props) => (
  <StyledHeading component="h2" {...props} />
);
export const Heading3 = (props: Props) => (
  <StyledHeading component="h3" {...props} />
);
export const Heading4 = (props: Props) => (
  <StyledHeading component="h4" {...props} />
);
export const Heading5 = (props: Props) => (
  <StyledHeading component="h5" {...props} />
);
export const Heading6 = (props: Props) => (
  <StyledHeading component="h6" {...props} />
);
