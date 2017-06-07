// @flow
import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
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

function Heading(
  {
    parent,
    placeholder,
    node,
    editor,
    onStar,
    onUnstar,
    readOnly,
    children,
    component = 'h1',
  }: Props,
  { starred }: Context
) {
  const firstHeading = parent.nodes.first() === node;
  const showPlaceholder = placeholder && firstHeading && !node.text;
  const slugish = _.escape(`${component}-${slug(node.text)}`);
  const showStar = readOnly && !!onStar;
  const showHash = readOnly && !!slugish && !showStar;
  const Component = component;

  return (
    <Component className={styles.title}>
      {children}
      {showPlaceholder &&
        <span className={styles.placeholder}>
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
