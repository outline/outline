// @flow
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import styled from "styled-components";
import { Outline, LabelText } from "./Input";

const Select = styled.select`
  border: 0;
  flex: 1;
  padding: 4px 0;
  margin: 0 12px;
  outline: none;
  background: none;
  color: ${(props) => props.theme.text};
  height: 30px;

  &:disabled,
  &::placeholder {
    color: ${(props) => props.theme.placeholder};
  }
`;

const Wrapper = styled.label`
  display: block;
  max-width: ${(props) => (props.short ? "350px" : "100%")};
`;

type Option = { label: string, value: string };

export type Props = {
  value?: string,
  label?: string,
  short?: boolean,
  className?: string,
  labelHidden?: boolean,
  options: Option[],
  onBlur?: () => void,
  onFocus?: () => void,
};

@observer
class InputSelect extends React.Component<Props> {
  @observable focused: boolean = false;

  handleBlur = () => {
    this.focused = false;
  };

  handleFocus = () => {
    this.focused = true;
  };

  render() {
    const {
      label,
      className,
      labelHidden,
      options,
      short,
      ...rest
    } = this.props;

    const wrappedLabel = <LabelText>{label}</LabelText>;

    return (
      <Wrapper short={short}>
        {label &&
          (labelHidden ? (
            <VisuallyHidden>{wrappedLabel}</VisuallyHidden>
          ) : (
            wrappedLabel
          ))}
        <Outline focused={this.focused} className={className}>
          <Select onBlur={this.handleBlur} onFocus={this.handleFocus} {...rest}>
            {options.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Outline>
      </Wrapper>
    );
  }
}

export default InputSelect;
