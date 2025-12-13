import * as React from "react";
import styled from "styled-components";
import Input, { Props as InputProps } from "./Input";
import Relative from "./Sidebar/components/Relative";
import { SwatchButton } from "./SwatchButton";

/**
 * Props for the InputColor component.
 */
type Props = Omit<InputProps, "onChange"> & {
  /** The current color value in hex format */
  value: string | undefined;
  /** Callback function invoked when the color value changes */
  onChange: (value: string) => void;
};

/**
 * A color input component that combines a text input with a color picker swatch button.
 * Automatically formats hex color values with a leading # character.
 */
const InputColor: React.FC<Props> = ({ value, onChange, ...rest }: Props) => (
  <Relative>
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/^#?/, "#"))}
      placeholder="#"
      maxLength={7}
      {...rest}
    />
    <PositionedSwatchButton color={value} onChange={onChange} size={22} />
  </Relative>
);

const PositionedSwatchButton = styled(SwatchButton)`
  border: 1px solid ${(props) => props.theme.inputBorder};
  position: absolute;
  bottom: 21px;
  right: 6px;
`;

export default InputColor;
