import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Flex from "~/components/Flex";
import Text from "~/components/Text";

type Props = {
  label: React.ReactNode;
  description: React.ReactNode;
  name: string;
  children: React.ReactNode;
  visible?: boolean;
};

const Row = styled(Flex)`
  display: block;
  padding: 16px 0;

  ${breakpoint("tablet")`
    display: flex;
    padding-bottom: 0;
  `};
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  flex-basis: 100%;
  flex: 1;
`;

const Label = styled(Text)`
  margin-bottom: 4px;
`;

export default function SettingRow(props: Props) {
  if (props.visible === false) {
    return null;
  }

  return (
    <Row gap={32}>
      <Column>
        <Label as="h3">
          <label htmlFor={props.name}>{props.label}</label>
        </Label>
        <Text type="secondary">{props.description}</Text>
      </Column>
      <Column>{props.children}</Column>
    </Row>
  );
}
