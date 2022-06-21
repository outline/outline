import { transparentize } from "polished";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Flex from "~/components/Flex";
import Text from "~/components/Text";

type Props = {
  label: React.ReactNode;
  description: React.ReactNode;
  name: string;
  visible?: boolean;
  border?: boolean;
};

const Row = styled(Flex)<{ $border?: boolean }>`
  display: block;
  padding: 24px 0;
  border-bottom: 1px solid
    ${(props) =>
      props.$border === false
        ? "transparent"
        : transparentize(0.5, props.theme.divider)};

  ${breakpoint("tablet")`
    display: flex;
  `};

  &:last-child {
    border-bottom: 0;
  }
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  flex-basis: 100%;
  flex: 1;

  &:first-child {
    min-width: 60%;
  }

  &:last-child {
    min-width: 0;
  }

  ${breakpoint("tablet")`
    p {
      margin-bottom: 0;
    }
  `};
`;

const Label = styled(Text)`
  margin-bottom: 4px;
`;

const SettingRow: React.FC<Props> = ({
  visible,
  description,
  name,
  label,
  border,
  children,
}) => {
  if (visible === false) {
    return null;
  }
  return (
    <Row gap={32} $border={border}>
      <Column>
        <Label as="h3">
          <label htmlFor={name}>{label}</label>
        </Label>
        <Text type="secondary">{description}</Text>
      </Column>
      <Column>{children}</Column>
    </Row>
  );
};

export default SettingRow;
