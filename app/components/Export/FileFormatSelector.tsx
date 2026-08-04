import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";
import styled from "styled-components";
import { s, hover } from "@shared/styles";
import Flex from "~/components/Flex";
import Text from "~/components/Text";

export interface FileFormat<T extends string> {
  /** The name of the format, e.g. "Markdown" */
  title: string;
  /** The extension of the file produced, e.g. ".md" */
  extension: string;
  /** An icon representing the format */
  icon: ReactNode;
  /** The value chosen when this format is selected */
  value: T;
}

type Props<T extends string> = {
  /** The formats available to choose between */
  formats: FileFormat<T>[];
  /** The currently selected format */
  value: NoInfer<T>;
  /** Called with the newly selected format */
  onChange: (value: NoInfer<T>) => void;
};

/**
 * A list of file formats to choose between, displayed as selectable cards.
 *
 * @param props The formats to display, the selected format, and a change handler.
 * @returns a radio group of file formats.
 */
export function FileFormatSelector<T extends string>({
  formats,
  value,
  onChange,
}: Props<T>) {
  const handleChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      onChange(ev.target.value as T);
    },
    [onChange]
  );

  return (
    <Flex gap={8} column>
      {formats.map((format) => (
        <Format key={format.value}>
          <HiddenInput
            type="radio"
            name="format"
            value={format.value}
            checked={value === format.value}
            onChange={handleChange}
          />
          <Flex align="center" gap={6}>
            <FormatIcon>{format.icon}</FormatIcon>
            <Text size="small" weight="xbold">
              {format.title}
            </Text>
          </Flex>
          <Text size="small" type="tertiary">
            {format.extension}
          </Text>
        </Format>
      ))}
    </Flex>
  );
}

const HiddenInput = styled.input`
  position: absolute;
  opacity: 0;
  pointer-events: none;
`;

const FormatIcon = styled.span`
  display: flex;
  flex-shrink: 0;
  color: ${s("textSecondary")};
  transition: color 100ms ease-in-out;
`;

const Format = styled.label`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  cursor: var(--pointer);
  background: ${s("backgroundSecondary")};
  box-shadow: inset 0 0 0 2px transparent;
  transition: box-shadow 100ms ease-in-out;

  &: ${hover} {
    background: ${s("backgroundTertiary")};
  }

  &:has(input:checked) {
    box-shadow: inset 0 0 0 2px ${s("accent")};

    ${FormatIcon} {
      color: ${s("text")};
    }
  }

  &:has(input:focus-visible) {
    outline: 2px solid ${s("accent")};
    outline-offset: 2px;
  }
`;
