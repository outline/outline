import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import Text from "~/components/Text";

export interface LabeledProps {
  label: React.ReactNode;
  optional?: boolean;
  children: React.ReactNode;
}

function Labeled({ label, optional, children }: LabeledProps) {
  return (
    <Wrapper>
      <LabelRow>
        <LabelText>{label}</LabelText>
        {optional && (
          <OptionalText type="secondary" size="xsmall">
            Optional
          </OptionalText>
        )}
      </LabelRow>
      {children}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const LabelRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
`;

const LabelText = styled.span`
  font-weight: 500;
  color: ${s("text")};
`;

const OptionalText = styled(Text)`
  color: ${s("textSecondary")};
`;

export default Labeled;

