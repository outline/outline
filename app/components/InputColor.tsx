import { WarningIcon } from "outline-icons";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import useMobile from "~/hooks/useMobile";
import type { Props as InputProps } from "./Input";
import Input from "./Input";
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
  const isMobile = useMobile();
  const warningId = React.useId();

  return (
    <>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/^#?/, "#"))}
        placeholder="#"
        maxLength={7}
        aria-describedby={warning ? warningId : undefined}
        {...rest}
      >
        {warning && (
          <WarningIcon
            aria-hidden
            color={theme.warning}
            size={isMobile ? 26 : 22}
          />
        )}
        <StyledSwatchButton
          color={value}
          onChange={onChange}
          size={isMobile ? 30 : 22}
        />
      </Input>
      {warning && (
        <WarningText id={warningId} type="secondary" size="xsmall">
          {warning}
        </WarningText>
      )}
    </>
  );
};

const StyledSwatchButton = styled(SwatchButton)`
  flex-shrink: 0;
  border: 1px solid ${(props) => props.theme.inputBorder};
  margin-inline: 2px 6px;
`;

const WarningText = styled(Text)`
  display: block;
  margin: -12px 0 16px;
  line-height: 1.4;
`;

export default InputColor;
