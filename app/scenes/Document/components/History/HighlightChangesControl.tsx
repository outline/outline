import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Text from "@shared/components/Text";
import { InputSelect, type Option } from "~/components/InputSelect";
import Switch from "~/components/Switch";

interface Props {
  showChanges: boolean;
  onShowChangesToggle: (checked: boolean) => void;
  compareOptions: Option[];
  compareTo: string;
  onCompareToChange: (value: string) => void;
}

export function HighlightChangesControl({
  showChanges,
  onShowChangesToggle,
  compareOptions,
  compareTo,
  onCompareToChange,
}: Props) {
  const { t } = useTranslation();

  return (
    <Content>
      <Text type="secondary" size="small" as="div" style={{ padding: 4 }}>
        <Switch
          label={t("Highlight changes")}
          checked={showChanges}
          onChange={onShowChangesToggle}
        />
      </Text>
      {showChanges && (
        <CompareToWrapper>
          <InputSelect
            options={compareOptions}
            value={compareTo}
            onChange={onCompareToChange}
            label={t("Compare to")}
            labelHidden
            nude
            short
          />
        </CompareToWrapper>
      )}
    </Content>
  );
}

const Content = styled.div`
  margin: 0 16px 8px;
  border: 1px solid ${(props) => props.theme.inputBorder};
  border-radius: 8px;
  padding: 8px 8px 0;
  flex-shrink: 0;
`;

const CompareToWrapper = styled.div`
  padding: 4px 0 8px;
`;
