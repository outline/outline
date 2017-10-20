// @flow
import React, { Component } from 'react';
import EditList from '../plugins/EditList';
import getDataTransferFiles from 'utils/getDataTransferFiles';
import Portal from 'react-portal';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import { color } from 'styles/constants';
import Icon from 'components/Icon';
import BlockMenu from 'menus/BlockMenu';
import type { State } from '../types';

const { transforms } = EditList;

type Props = {
  state: State,
  onChange: Function,
  onInsertImage: File => Promise<*>,
};

@observer
export default class BlockInsert extends Component {
  props: Props;
  mouseMoveTimeout: number;
  file: HTMLInputElement;

  @observable active: boolean = false;
  @observable menuOpen: boolean = false;
  @observable top: number;
  @observable left: number;
  @observable mouseX: number;

  componentDidMount = () => {
    this.update();
    window.addEventListener('mousemove', this.handleMouseMove);
  };

  componentWillUpdate = (nextProps: Props) => {
    this.update(nextProps);
  };

  componentWillUnmount = () => {
    window.removeEventListener('mousemove', this.handleMouseMove);
  };

  setInactive = () => {
    if (this.menuOpen) return;
    this.active = false;
  };

  handleMouseMove = (ev: SyntheticMouseEvent) => {
    const windowWidth = window.innerWidth / 3;
    let active = ev.clientX < windowWidth;

    if (active !== this.active) {
      this.active = active || this.menuOpen;
    }
    if (active) {
      clearTimeout(this.mouseMoveTimeout);
      this.mouseMoveTimeout = setTimeout(this.setInactive, 2000);
    }
  };

  handleMenuOpen = () => {
    this.menuOpen = true;
  };

  handleMenuClose = () => {
    this.menuOpen = false;
  };

  update = (props?: Props) => {
    if (!document.activeElement) return;
    const { state } = props || this.props;
    const boxRect = document.activeElement.getBoundingClientRect();
    const selection = window.getSelection();
    if (!selection.focusNode) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.top <= 0 || boxRect.left <= 0) return;

    if (state.startBlock.type === 'heading1') {
      this.active = false;
    }

    this.top = Math.round(rect.top + window.scrollY);
    this.left = Math.round(boxRect.left + window.scrollX - 20);
  };

  insertBlock = (
    ev: SyntheticEvent,
    options: {
      type: string | Object,
      wrapper?: string | Object,
      append?: string | Object,
    }
  ) => {
    ev.preventDefault();
    const { type, wrapper, append } = options;
    let { state } = this.props;
    let transform = state.transform();
    const { document } = state;
    const parent = document.getParent(state.startBlock.key);

    // lists get some special treatment
    if (parent && parent.type === 'list-item') {
      transform = transforms.unwrapList(
        transforms
          .splitListItem(transform.collapseToStart())
          .collapseToEndOfPreviousBlock()
      );
    }

    transform = transform.insertBlock(type);

    if (wrapper) transform = transform.wrapBlock(wrapper);
    if (append) transform = transform.insertBlock(append);

    state = transform.focus().apply();
    this.props.onChange(state);
    this.active = false;
  };

  onPickImage = (ev: SyntheticEvent) => {
    // simulate a click on the file upload input element
    this.file.click();
  };

  onChooseImage = async (ev: SyntheticEvent) => {
    const files = getDataTransferFiles(ev);
    for (const file of files) {
      await this.props.onInsertImage(file);
    }
  };

  render() {
    const style = { top: `${this.top}px`, left: `${this.left}px` };
    const todo = { type: 'list-item', data: { checked: false } };
    const rule = { type: 'horizontal-rule', isVoid: true };

    return (
      <Portal isOpened>
        <Trigger active={this.active} style={style}>
          <HiddenInput
            type="file"
            innerRef={ref => (this.file = ref)}
            onChange={this.onChooseImage}
            accept="image/*"
          />
          <BlockMenu
            label={<Icon type="PlusCircle" />}
            onPickImage={this.onPickImage}
            onInsertList={ev =>
              this.insertBlock(ev, {
                type: 'list-item',
                wrapper: 'bulleted-list',
              })}
            onInsertTodoList={ev =>
              this.insertBlock(ev, { type: todo, wrapper: 'todo-list' })}
            onInsertBreak={ev =>
              this.insertBlock(ev, { type: rule, append: 'paragraph' })}
            onOpen={this.handleMenuOpen}
            onClose={this.handleMenuClose}
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
  background-color: ${color.white};
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
