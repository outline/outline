import { BackIcon } from "outline-icons";
import React from "react";
import styled from "styled-components";
import { breakpoints, s } from "@shared/styles";
import { colorPalette } from "@shared/utils/collections";
import { validateColorHex } from "@shared/utils/color";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
import { hover } from "~/styles";

enum Panel {
  Builtin,
  Hex,
}

type Props = {
  width: number;
  activeColor: string;
  onSelect: (color: string) => void;
};

const ColorPicker = ({ width, activeColor, onSelect }: Props) => {
  const [localValue, setLocalValue] = React.useState(activeColor);

  const [panel, setPanel] = React.useState(
    colorPalette.includes(activeColor) ? Panel.Builtin : Panel.Hex
  );

  const handleSwitcherClick = React.useCallback(() => {
    setPanel(panel === Panel.Builtin ? Panel.Hex : Panel.Builtin);
  }, [panel, setPanel]);

  const isLargeMobile = width > breakpoints.mobileLarge + 12; // 12px for the Container padding

  React.useEffect(() => {
    setLocalValue(activeColor);
    setPanel(colorPalette.includes(activeColor) ? Panel.Builtin : Panel.Hex);
  }, [activeColor]);

  return isLargeMobile ? (
    <Container justify="space-between">
      <LargeMobileBuiltinColors activeColor={activeColor} onClick={onSelect} />
      <LargeMobileCustomColor
        value={localValue}
        setLocalValue={setLocalValue}
        onValidHex={onSelect}
      />
    </Container>
  ) : (
    <Container gap={12}>
      <PanelSwitcher align="center">
        <SwitcherButton panel={panel} onClick={handleSwitcherClick}>
          {panel === Panel.Builtin ? "#" : <BackIcon />}
        </SwitcherButton>
      </PanelSwitcher>
      {panel === Panel.Builtin ? (
        <BuiltinColors activeColor={activeColor} onClick={onSelect} />
      ) : (
        <CustomColor
          value={localValue}
          setLocalValue={setLocalValue}
          onValidHex={onSelect}
        />
      )}
    </Container>
  );
};

const BuiltinColors = ({
  activeColor,
  onClick,
  className,
}: {
  activeColor: string;
  onClick: (color: string) => void;
  className?: string;
}) => (
  <Flex className={className} justify="space-between" align="center" auto>
    {colorPalette.map((color) => (
      <ColorButton
        key={color}
        color={color}
        active={color === activeColor}
        onClick={() => onClick(color)}
      >
        <Selected />
      </ColorButton>
    ))}
  </Flex>
);

const CustomColor = ({
  value,
  setLocalValue,
  onValidHex,
  className,
}: {
  value: string;
  setLocalValue: (value: string) => void;
  onValidHex: (color: string) => void;
  className?: string;
}) => {
  const hasHexChars = React.useCallback(
    (color: string) => /(^#[0-9A-F]{1,6}$)/i.test(color),
    []
  );

  const handleInputChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      const val = ev.target.value;

      if (val === "" || val === "#") {
        setLocalValue("#");
        return;
      }

      const uppercasedVal = val.toUpperCase();

      if (hasHexChars(uppercasedVal)) {
        setLocalValue(uppercasedVal);
      }

      if (validateColorHex(uppercasedVal)) {
        onValidHex(uppercasedVal);
      }
    },
    [setLocalValue, hasHexChars, onValidHex]
  );

  return (
    <Flex className={className} align="center" gap={8}>
      <Text type="tertiary" size="small">
        HEX
      </Text>
      <CustomColorInput
        maxLength={7}
        value={value}
        onChange={handleInputChange}
      />
    </Flex>
  );
};

const Container = styled(Flex)`
  height: 48px;
  padding: 8px 12px;
  border-bottom: 1px solid ${s("inputBorder")};
`;

const Selected = styled.span`
  width: 8px;
  height: 4px;
  border-left: 1px solid white;
  border-bottom: 1px solid white;
  transform: translateY(-25%) rotate(-45deg);
`;

const ColorButton = styled(NudeButton)<{ color: string; active: boolean }>`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${({ color }) => color};

  &: ${hover} {
    outline: 2px solid ${s("menuBackground")} !important;
    box-shadow: ${({ color }) => `0px 0px 3px 3px ${color}`};
  }

  & ${Selected} {
    display: ${({ active }) => (active ? "block" : "none")};
  }
`;

const PanelSwitcher = styled(Flex)`
  width: 40px;
  border-right: 1px solid ${s("inputBorder")};
`;

const SwitcherButton = styled(NudeButton)<{ panel: Panel }>`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  border: 1px solid ${s("inputBorder")};
  transition: all 100ms ease-in-out;

  &: ${hover} {
    border-color: ${s("inputBorderFocused")};
  }
`;

const LargeMobileBuiltinColors = styled(BuiltinColors)`
  max-width: 380px;
  padding-right: 8px;
`;

const LargeMobileCustomColor = styled(CustomColor)`
  padding-left: 8px;
  border-left: 1px solid ${s("inputBorder")};
  width: 120px;
`;

const CustomColorInput = styled.input.attrs(() => ({
  type: "text",
  autocomplete: "off",
}))`
  font-size: 14px;
  color: ${s("textSecondary")};
  background: transparent;
  border: 0;
  outline: 0;
`;

export default ColorPicker;
