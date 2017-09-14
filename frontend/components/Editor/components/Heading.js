// @flow
import React from 'react';
import { Document } from 'slate';
import styled from 'styled-components';
import _ from 'lodash';
import slug from 'slug';
import type { Node, Editor } from '../types';
import Placeholder from './Placeholder';

type Props = {
  children: React$Element<any>,
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
  } = props;
  const parentIsDocument = parent instanceof Document;
  const firstHeading = parentIsDocument && parent.nodes.first() === node;
  const showPlaceholder = placeholder && firstHeading && !node.text;
  const slugish = _.escape(`${component}-${slug(node.text)}`);
  const showHash = readOnly && !!slugish;
  const Component = component;
  const emoji = editor.props.emoji || '';
  const title = node.text.trim();
  const startsWithEmojiAndSpace =
    emoji && title.match(new RegExp(`^${emoji}\\s`));

  return (
    <Component>
      <Wrapper hasEmoji={startsWithEmojiAndSpace}>{children}</Wrapper>
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
  margin-left: ${props => (props.hasEmoji ? '-1.2em' : 0)}
`;

const Anchor = styled.a`
  visibility: hidden;
  padding-left: .25em;
  color: #dedede;

  &:hover {
    color: #cdcdcd;
  }
`;

export const Heading1 = styled(Heading)`
  position: relative;

  &:hover {
    ${Anchor} {
      visibility: visible;
    }
  }
`;
export const Heading2 = Heading1.withComponent('h2');
export const Heading3 = Heading1.withComponent('h3');
export const Heading4 = Heading1.withComponent('h4');
export const Heading5 = Heading1.withComponent('h5');
export const Heading6 = Heading1.withComponent('h6');

export default Heading;
