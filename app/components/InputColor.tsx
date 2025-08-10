import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import lazyWithRetry from "~/utils/lazyWithRetry";
import DelayedMount from "./DelayedMount";
import Input, { Props as InputProps } from "./Input";
import NudeButton from "./NudeButton";
import Relative from "./Sidebar/components/Relative";
import Text from "./Text";
import { Popover, PopoverContent, PopoverTrigger } from "./primitives/Popover";

type Props = Omit<InputProps, "onChange"> & {
  value: string | undefined;
  onChange: (value: string) => void;
};

const InputColor: React.FC<Props> = ({ value, onChange, ...rest }: Props) => {
  const { t } = useTranslation();

  return (
    <Relative>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/^#?/, "#"))}
        placeholder="#"
        maxLength={7}
        {...rest}
      />
      <Popover modal={true}>
        <PopoverTrigger>
          <SwatchButton aria-label={t("Show menu")} $background={value} />
        </PopoverTrigger>
        <StyledContent aria-label={t("Select a color")} align="end">
          <React.Suspense
            fallback={
              <DelayedMount>
                <Text>{t("Loading")}…</Text>
              </DelayedMount>
            }
          >
            <StyledColorPicker
              disableAlpha
              color={value}
              onChange={(color) => onChange(color.hex)}
            />
          </React.Suspense>
        </StyledContent>
      </Popover>
    </Relative>
  );
};

const SwatchButton = styled(NudeButton)<{ $background: string | undefined }>`
  background: ${(props) => props.$background};
  border: 1px solid ${s("inputBorder")};
  border-radius: 50%;
  position: absolute;
  bottom: 20px;
  right: 6px;
`;

const StyledContent = styled(PopoverContent)`
  width: auto;
  padding: 8px;
`;

const ColorPicker = lazyWithRetry(
  () => import("react-color/lib/components/chrome/Chrome")
);

const StyledColorPicker = styled(ColorPicker)`
  background: inherit !important;
  box-shadow: none !important;
  border: 0 !important;
  border-radius: 0 !important;
  user-select: none;

  input {
    user-select: text;
    color: ${s("text")} !important;
  }
`;

export default InputColor;
