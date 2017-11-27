// @flow
import React from 'react';
import { observable, computed, action } from 'mobx';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import Flex from 'shared/components/Flex';
import { LabelText, Outline } from 'components/Input';
import { color, fonts, fontWeight } from 'shared/styles/constants';
import { validateColorHex } from 'shared/utils/color';

const colors = [
  '#4E5C6E',
  '#19B7FF',
  '#7F6BFF',
  '#FC7419',
  '#FC2D2D',
  '#FFE100',
  '#14CF9F',
  '#EE84F0',
  '#2F362F',
];

type Props = {
  onSelect: (color: string) => void,
  value?: string,
};

@observer
class ColorPicker extends React.Component {
  props: Props;

  @observable selectedColor: string = colors[0];
  @observable customColorValue: string = '';
  @observable customColorSelected: boolean;

  componentWillMount() {
    const { value } = this.props;
    if (value && colors.includes(value)) {
      this.selectedColor = value;
    } else if (value) {
      this.customColorSelected = true;
      this.customColorValue = value.replace('#', '');
    }
  }

  componentDidMount() {
    this.fireCallback();
  }

  fireCallback = () => {
    this.props.onSelect(
      this.customColorSelected ? this.customColor : this.selectedColor
    );
  };

  @computed
  get customColor(): string {
    return this.customColorValue &&
      validateColorHex(`#${this.customColorValue}`)
      ? `#${this.customColorValue}`
      : colors[0];
  }

  @action
  setColor = (color: string) => {
    this.selectedColor = color;
    this.customColorSelected = false;
    this.fireCallback();
  };

  @action
  focusOnCustomColor = (event: SyntheticEvent) => {
    this.selectedColor = '';
    this.customColorSelected = true;
    this.fireCallback();
  };

  @action
  setCustomColor = (event: SyntheticEvent) => {
    let target = event.target;
    if (target instanceof HTMLInputElement) {
      const color = target.value;
      this.customColorValue = color.replace('#', '');
      this.fireCallback();
    }
  };

  render() {
    return (
      <Flex column>
        <LabelText>Color</LabelText>
        <StyledOutline justify="space-between">
          <Flex>
            {colors.map(color => (
              <Swatch
                key={color}
                color={color}
                active={
                  color === this.selectedColor && !this.customColorSelected
                }
                onClick={() => this.setColor(color)}
              />
            ))}
          </Flex>
          <Flex justify="flex-end">
            <strong>Custom color:</strong>
            <HexHash>#</HexHash>
            <CustomColorInput
              placeholder="FFFFFF"
              onFocus={this.focusOnCustomColor}
              onChange={this.setCustomColor}
              value={this.customColorValue}
              maxLength={6}
            />
            <Swatch
              color={this.customColor}
              active={this.customColorSelected}
            />
          </Flex>
        </StyledOutline>
      </Flex>
    );
  }
}

type SwatchProps = {
  onClick?: () => void,
  color?: string,
  active?: boolean,
};

const Swatch = ({ onClick, ...props }: SwatchProps) => (
  <SwatchOutset onClick={onClick} {...props}>
    <SwatchInset {...props} />
  </SwatchOutset>
);

const SwatchOutset = styled(Flex)`
  width: 24px;
  height: 24px;
  margin-right: 5px;
  border: 2px solid ${({ active, color }) => (active ? color : 'transparent')};
  border-radius: 2px;
  background: ${({ color }) => color};
  ${({ onClick }) => onClick && `cursor: pointer;`} &:last-child {
    margin-right: 0;
  }
`;

const SwatchInset = styled(Flex)`
  width: 20px;
  height: 20px;
  border: 1px solid ${({ active, color }) => (active ? 'white' : 'transparent')};
  border-radius: 2px;
  background: ${({ color }) => color};
`;

const StyledOutline = styled(Outline)`
  padding: 5px;

  strong {
    font-weight: 500;
  }
`;

const HexHash = styled.div`
  margin-left: 12px;
  padding-bottom: 0;
  font-weight: ${fontWeight.medium};
  user-select: none;
`;

const CustomColorInput = styled.input`
  border: 0;
  flex: 1;
  width: 65px;
  margin-right: 12px;
  padding-bottom: 0;
  outline: none;
  background: none;
  font-family: ${fonts.monospace};
  font-weight: ${fontWeight.medium};

  &::placeholder {
    color: ${color.slate};
    font-family: ${fonts.monospace};
    font-weight: ${fontWeight.medium};
  }
`;

export default ColorPicker;
