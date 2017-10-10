// @flow
import React, { Component } from 'react';
import getDataTransferFiles from 'utils/getDataTransferFiles';
import Portal from 'react-portal';
import styled from 'styled-components';
import Icon from 'components/Icon';
import BlockMenu from 'menus/BlockMenu';
import _ from 'lodash';
import type { State } from '../types';

export default class BlockInsert extends Component {
  props: {
    state: State,
    onChange: Function,
    onInsertImage: File => Promise,
  };

  menu: HTMLElement;
  state: {
    active: boolean,
    focused: boolean,
    top: string,
    left: string,
    mouseX: number,
  };

  state = {
    active: false,
    focused: false,
    top: '',
    left: '',
  };

  componentDidMount = () => {
    this.update();
    window.addEventListener('mousemove', this.handleMouseMove);
  };

  componentWillUpdate = nextProps => {
    this.update(nextProps);
  };

  componentWillUnmount = () => {
    window.removeEventListener('mousemove', this.handleMouseMove);
  };

  setInactive = () => {
    console.log('setInactive');
    this.setState({ active: false });
  };

  handleMouseMove = (ev: SyntheticEvent) => {
    const windowWidth = window.innerWidth / 3;
    const { state } = this.props;
    let active = ev.clientX < windowWidth;

    if (active !== this.state.active) {
      console.log('setting active', active);
      this.setState({ active });
    }
    if (active) {
      clearTimeout(this.mouseMoveTimeout);
      this.mouseMoveTimeout = setTimeout(this.setInactive, 2000);
    }
  };

  update = props => {
    console.log('update');
    if (!document.activeElement) return;
    const { state } = props || this.props;
    const boxRect = document.activeElement.getBoundingClientRect();
    const selection = window.getSelection();
    if (!selection.focusNode) return;

    const data = { ...this.state };
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.top <= 0 || boxRect.left <= 0) return;

    if (state.startBlock.type === 'heading1') {
      data.active = false;
    }

    data.top = `${Math.round(rect.top + window.scrollY)}px`;
    data.left = `${Math.round(boxRect.left + window.scrollX - 20)}px`;

    if (!_.isEqual(data, this.state)) {
      this.setState(data);
    }
  };

  setRef = (ref: HTMLElement) => {
    this.menu = ref;
  };

  onInsertBreak = ev => {
    ev.preventDefault();
    let { state } = this.props;

    state = state.transform().insertBlock('horizontal-rule').apply();
    this.props.onChange(state);
  };

  onInsertTodoList = ev => {
    ev.preventDefault();
    let { state } = this.props;

    state = state
      .transform()
      .insertBlock({ type: 'list-item', data: { checked: false } })
      .wrapBlock('todo-list')
      .collapseToEnd()
      .focus()
      .apply();
    this.props.onChange(state);
  };

  onInsertList = ev => {
    ev.preventDefault();
    let { state } = this.props;

    state = state
      .transform()
      .insertBlock('list-item')
      .wrapBlock('bulleted-list')
      .collapseToEnd()
      .focus()
      .apply();
    this.props.onChange(state);
  };

  onPickImage = ev => {
    this.file.click();
  };

  onChooseImage = async ev => {
    const files = getDataTransferFiles(ev);
    for (const file of files) {
      await this.props.onInsertImage(file);
    }
  };

  render() {
    const style = {
      top: this.state.top,
      left: this.state.left,
    };

    return (
      <Portal isOpened>
        <Trigger
          active={this.state.active}
          innerRef={this.setRef}
          style={style}
        >
          <HiddenInput
            type="file"
            innerRef={ref => (this.file = ref)}
            onChange={this.onChooseImage}
            accept="image/*"
          />
          <BlockMenu
            label={<Icon type="PlusCircle" />}
            onPickImage={this.onPickImage}
            onInsertList={this.onInsertList}
            onInsertTodoList={this.onInsertTodoList}
            onInsertBreak={this.onInsertBreak}
          />
        </Trigger>
      </Portal>
    );
  }
}

const HiddenInput = styled.input`
  position: absolute;
  top: -100px;
  left: -100px;
  visibility: hidden;
`;

const Trigger = styled.div`
  position: absolute;
  z-index: 1;
  opacity: 0;
  background-color: #fff;
  border-radius: 4px;
  transition: opacity 250ms ease-in-out, transform 250ms ease-in-out;
  line-height: 0;
  height: 16px;
  width: 16px;
  transform: scale(.9);

  ${({ active }) => active && `
    transform: scale(1);
    opacity: .9;
  `}
`;
