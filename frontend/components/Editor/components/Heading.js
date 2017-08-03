// @flow
import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Document } from 'slate';
import _ from 'lodash';
import slug from 'slug';
import StarIcon from 'components/Icon/StarIcon';
import type { Node, Editor } from '../types';
import styles from '../Editor.scss';

type Props = {
  children: React$Element<any>,
  placeholder?: boolean,
  parent: Node,
  node: Node,
  onStar?: Function,
  onUnstar?: Function,
  editor: Editor,
  readOnly: boolean,
  component?: string,
};

type Context = {
  starred?: boolean,
};

const Wrapper = styled.div`
  margin-left: ${props => (props.hasEmoji ? '-1.2em' : 0)}
`;

const StyledStar = styled(StarIcon)`
  top: 3px;
  position: relative;
  margin-left: 4px;
  opacity: ${props => (props.solid ? 1 : 0.25)};
  transition: opacity 100ms ease-in-out;

  &:hover {
    opacity: 1;
  }

  svg {
    width: 28px;
    height: 28px;
  }
`;

function Heading(props: Props, { starred }: Context) {
  const {
    parent,
    placeholder,
    node,
    editor,
    onStar,
    onUnstar,
    readOnly,
    children,
    component = 'h1',
  } = props;
  const parentIsDocument = parent instanceof Document;
  const firstHeading = parentIsDocument && parent.nodes.first() === node;
  const showPlaceholder = placeholder && firstHeading && !node.text;
  const slugish = _.escape(`${component}-${slug(node.text)}`);
  const showStar = readOnly && !!onStar;
  const showHash = readOnly && !!slugish && !showStar;
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
      {showStar && starred && <a onClick={onUnstar}><StyledStar solid /></a>}
      {showStar && !starred && <a onClick={onStar}><StyledStar /></a>}
    </Component>
  );
}

Heading.contextTypes = {
  starred: PropTypes.bool,
};

export default Heading;
