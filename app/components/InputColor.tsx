import { WarningIcon } from "outline-icons";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import type { Props as InputProps } from "./Input";
import Input from "./Input";
import Relative from "./Sidebar/components/Relative";
import { SwatchButton } from "./SwatchButton";
import Text from "./Text";

/**
 * Props for the InputColor component.
 */
type Props = Omit<InputProps, "onChange"> & {
  /** The current color value in hex format */
  value: string | undefined;
  /** Callback function invoked when the color value changes */
  onChange: (value: string) => void;
  /** An optional warning to show next to the color, such as low contrast */
  warning?: string;
};

/**
 * A color input component that combines a text input with a color picker swatch button.
 * Automatically formats hex color values with a leading # character.
 */
const InputColor: React.FC<Props> = ({
  value,
  onChange,
  warning,
  ...rest
}: Props) => {
  const theme = useTheme();
  const warningId = React.useId();

  return (
    <>
      <Relative>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/^#?/, "#"))}
          placeholder="#"
          maxLength={7}
          aria-describedby={warning ? warningId : undefined}
          {...rest}
        />
        {warning && (
          <PositionedWarning aria-hidden>
            <WarningIcon color={theme.warning} size={22} />
          </PositionedWarning>
        )}
        <PositionedSwatchButton color={value} onChange={onChange} size={22} />
      </Relative>
      {warning && (
        <WarningText id={warningId} type="secondary" size="xsmall">
          {warning}
        </WarningText>
      )}
    </>
  );
};

const PositionedSwatchButton = styled(SwatchButton)`
  border: 1px solid ${(props) => props.theme.inputBorder};
  position: absolute;
  bottom: 21px;
  inset-inline-end: 6px;
`;

const PositionedWarning = styled.span`
  display: flex;
  position: absolute;
  bottom: 21px;
  inset-inline-end: 32px;
`;

const WarningText = styled(Text)`
  display: block;
  margin: -12px 0 16px;
  line-height: 1.4;
`;

export default InputColor;
