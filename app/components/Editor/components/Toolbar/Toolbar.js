// @flow
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { Portal } from 'react-portal';
import styled from 'styled-components';
import _ from 'lodash';
import type { State } from '../../types';
import FormattingToolbar from './components/FormattingToolbar';
import LinkToolbar from './components/LinkToolbar';

@observer
export default class Toolbar extends Component {
  @observable active: boolean = false;
  @observable focused: boolean = false;
  @observable link: ?React$Element<any>;
  @observable top: string = '';
  @observable left: string = '';

  props: {
    state: State,
    onChange: (state: State) => void,
  };

  menu: HTMLElement;

  componentDidMount = () => {
    this.update();
  };

  componentDidUpdate = () => {
    this.update();
  };

  handleFocus = () => {
    this.focused = true;
  };

  handleBlur = () => {
    this.focused = false;
  };

  get linkInSelection(): any {
    const { state } = this.props;

    try {
      const selectedLinks = state.startBlock
        .getInlinesAtRange(state.selection)
        .filter(node => node.type === 'link');
      if (selectedLinks.size) {
        return selectedLinks.first();
      }
    } catch (err) {
      //
    }
  }

  update = () => {
    const { state } = this.props;
    const link = this.linkInSelection;

    if (state.isBlurred || (state.isCollapsed && !link)) {
      if (this.active && !this.focused) {
        this.active = false;
        this.link = undefined;
        this.top = '';
        this.left = '';
      }
      return;
    }

    // don't display toolbar for document title
    const firstNode = state.document.nodes.first();
    if (firstNode === state.startBlock) return;

    // don't display toolbar for code blocks
    if (state.startBlock.type === 'code') return;

    this.active = true;
    this.focused = !!link;
    this.link = link;

    const padding = 16;
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.top === 0 && rect.left === 0) {
      return;
    }

    const left =
      rect.left + window.scrollX - this.menu.offsetWidth / 2 + rect.width / 2;
    this.top = `${Math.round(
      rect.top + window.scrollY - this.menu.offsetHeight
    )}px`;
    this.left = `${Math.round(Math.max(padding, left))}px`;
  };

  setRef = (ref: HTMLElement) => {
    this.menu = ref;
  };

  render() {
    const style = {
      top: this.top,
      left: this.left,
    };

    return (
      <Portal>
        <Menu active={this.active} innerRef={this.setRef} style={style}>
          {this.link ? (
            <LinkToolbar
              {...this.props}
              link={this.link}
              onBlur={this.handleBlur}
            />
          ) : (
            <FormattingToolbar
              onCreateLink={this.handleFocus}
              {...this.props}
            />
          )}
        </Menu>
      </Portal>
    );
  }
}

const Menu = styled.div`
  padding: 8px 16px;
  position: absolute;
  z-index: 2;
  top: -10000px;
  left: -10000px;
  opacity: 0;
  background-color: #2f3336;
  border-radius: 4px;
  transform: scale(0.95);
  transition: opacity 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275),
    transform 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
  line-height: 0;
  height: 40px;
  min-width: 260px;

  ${({ active }) =>
    active &&
    `
    transform: translateY(-6px) scale(1);
    opacity: 1;
  `};

  @media print {
    display: none;
  }
`;
