import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { colorPalettes } from "@shared/constants";
import Flex from "~/components/Flex";
import type { Option } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
import { SwatchButton } from "~/components/SwatchButton";

/** Select value shown when the palette matches no built-in preset. */
const CustomPaletteId = "custom";

type Props = {
  /** The hex colors in the current palette. */
  value: string[];
  /** Callback invoked with the full palette when a preset or color changes. */
  onChange: (palette: string[]) => void;
};

/**
 * A preset selector and editable swatches for the workspace icon color palette.
 */
export function ColorPalette({ value, onChange }: Props) {
  const { t } = useTranslation();

  const paletteId =
    colorPalettes.find((preset) =>
      preset.colors.every((color, index) => color === value[index])
    )?.id ?? CustomPaletteId;

  const options: Option[] = React.useMemo(() => {
    const items: Option[] = colorPalettes.map((preset) => ({
      type: "item",
      label: t(preset.name),
      value: preset.id,
      icon: <PalettePreview colors={preset.colors} />,
    }));
    if (paletteId === CustomPaletteId) {
      items.push({
        type: "item",
        label: t("Custom"),
        value: CustomPaletteId,
        icon: <PalettePreview colors={value} />,
      });
    }
    return items;
  }, [t, paletteId, value]);

  const handlePresetChange = React.useCallback(
    (id: string) => {
      const preset = colorPalettes.find((item) => item.id === id);
      if (!preset) {
        return;
      }
      onChange([...preset.colors]);
    },
    [onChange]
  );

  const handleColorChange = React.useCallback(
    (index: number, color: string) => {
      onChange(value.map((existing, i) => (i === index ? color : existing)));
    },
    [onChange, value]
  );

  return (
    <>
      <InputSelect
        options={options}
        value={paletteId}
        onChange={handlePresetChange}
        label={t("Color palette")}
        labelHidden
      />
      <Swatches gap={8} wrap>
        {value.map((color, index) => (
          <SwatchButton
            key={index}
            color={color}
            size={24}
            onChange={(next) => handleColorChange(index, next)}
          />
        ))}
      </Swatches>
    </>
  );
}

/** A segmented line showing every color in a palette. */
const PalettePreview = ({ colors }: { colors: string[] }) => (
  <Segments aria-hidden>
    {colors.map((color, index) => (
      <Segment key={index} style={{ background: color }} />
    ))}
  </Segments>
);

// Offsets the negative start margin the select applies to option icons.
const Segments = styled.span`
  display: flex;
  width: 56px;
  height: 8px;
  margin-inline-start: 4px;
  border-radius: 4px;
  overflow: hidden;
`;

const Segment = styled.span`
  flex: 1;
`;

const Swatches = styled(Flex)`
  margin-top: 12px;
`;
