// @flow
import React from 'react';
import { Document } from 'slate';
import styled from 'styled-components';
import _ from 'lodash';
import slug from 'slug';
import type { Node, Editor } from '../types';
import styles from '../Editor.scss';

type Props = {
  children: React$Element<any>,
  placeholder?: boolean,
  parent: Node,
  node: Node,
  editor: Editor,
  readOnly: boolean,
  component?: string,
};

const Wrapper = styled.div`
  display: inline;
  margin-left: ${props => (props.hasEmoji ? '-1.2em' : 0)}
`;

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
    <Component className={styles.title}>
      <Wrapper hasEmoji={startsWithEmojiAndSpace}>{children}</Wrapper>
      {showPlaceholder &&
        <span className={styles.placeholder} contentEditable={false}>
          {editor.props.placeholder}
        </span>}
      {showHash &&
        <a name={slugish} className={styles.anchor} href={`#${slugish}`}>#</a>}
    </Component>
  );
}

export default Heading;
