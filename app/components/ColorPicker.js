// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { TwitterPicker } from 'react-color';
import styled from 'styled-components';
import Fade from 'components/Fade';
import { LabelText } from 'components/Input';

const colors = [
  '#4E5C6E',
  '#19B7FF',
  '#7F6BFF',
  '#FC7419',
  '#FC2D2D',
  '#FFE100',
  '#14CF9F',
  '#00D084',
  '#EE84F0',
  '#2F362F',
];

type Props = {
  onChange: (color: string) => void,
  value?: string,
};

@observer
class ColorPicker extends React.Component<Props> {
  @observable isOpen: boolean = false;
  node: ?HTMLElement;

  componentDidMount() {
    window.addEventListener('click', this.handleClickOutside);
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.handleClickOutside);
  }

  handleClose = () => {
    this.isOpen = false;
  };

  handleOpen = () => {
    this.isOpen = true;
  };

  handleClickOutside = (ev: SyntheticMouseEvent<>) => {
    // $FlowFixMe
    if (ev.target && this.node && this.node.contains(ev.target)) {
      return;
    }

    this.handleClose();
  };

  render() {
    return (
      <Wrapper ref={ref => (this.node = ref)}>
        <label>
          <LabelText>Color</LabelText>
        </label>
        <Swatch
          role="button"
          onClick={this.isOpen ? this.handleClose : this.handleOpen}
          color={this.props.value}
        />
        <Floating>
          {this.isOpen && (
            <Fade>
              <TwitterPicker
                colors={colors}
                color={this.props.value}
                onChange={color => this.props.onChange(color.hex)}
                triangle="top-right"
              />
            </Fade>
          )}
        </Floating>
      </Wrapper>
    );
  }
}

const Wrapper = styled('div')`
  display: inline-block;
  position: relative;
`;
const Floating = styled('div')`
  position: absolute;
  top: 60px;
  right: 0;
  z-index: 1;
`;

const Swatch = styled('div')`
  display: inline-block;
  width: 48px;
  height: 32px;
  border: 1px solid ${({ active, color }) => (active ? 'white' : 'transparent')};
  border-radius: 4px;
  background: ${({ color }) => color};
`;

export default ColorPicker;
