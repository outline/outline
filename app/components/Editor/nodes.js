// @flow
import React from 'react';
import Code from './components/Code';
import BlockToolbar from './components/Toolbar/BlockToolbar';
import HorizontalRule from './components/HorizontalRule';
import Image from './components/Image';
import Link from './components/Link';
import ListItem from './components/ListItem';
import TodoList from './components/TodoList';
import {
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
} from './components/Heading';
import Paragraph from './components/Paragraph';
import type { props } from 'slate-prop-types';

type Options = {
  onInsertImage: *,
};

export default function createRenderNode({ onChange, onInsertImage }: Options) {
  return function renderNode(props: props) {
    const { attributes } = props;

    switch (props.node.type) {
      case 'paragraph':
        return <Paragraph {...props} />;
      case 'block-toolbar':
        return <BlockToolbar onInsertImage={onInsertImage} {...props} />;
      case 'block-quote':
        return <blockquote {...attributes}>{props.children}</blockquote>;
      case 'bulleted-list':
        return <ul {...attributes}>{props.children}</ul>;
      case 'ordered-list':
        return <ol {...attributes}>{props.children}</ol>;
      case 'todo-list':
        return <TodoList {...attributes}>{props.children}</TodoList>;
      case 'table':
        return <table {...attributes}>{props.children}</table>;
      case 'table-row':
        return <tr {...attributes}>{props.children}</tr>;
      case 'table-head':
        return <th {...attributes}>{props.children}</th>;
      case 'table-cell':
        return <td {...attributes}>{props.children}</td>;
      case 'list-item':
        return <ListItem {...props} />;
      case 'horizontal-rule':
        return <HorizontalRule {...props} />;
      case 'code':
        return <Code {...props} />;
      case 'image':
        return <Image {...props} />;
      case 'link':
        return <Link {...props} />;
      case 'heading1':
        return <Heading1 placeholder {...props} />;
      case 'heading2':
        return <Heading2 {...props} />;
      case 'heading3':
        return <Heading3 {...props} />;
      case 'heading4':
        return <Heading4 {...props} />;
      case 'heading5':
        return <Heading5 {...props} />;
      case 'heading6':
        return <Heading6 {...props} />;
      default:
    }
  };
}
