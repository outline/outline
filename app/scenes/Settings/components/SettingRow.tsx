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
};

const Row = styled(Flex)`
  display: block;
  min-height: 100px;
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

export default function SettingRow(props: Props) {
  return (
    <Row gap={32}>
      <Column>
        <Text as="h3">
          <label htmlFor={props.name}>{props.label}</label>
        </Text>
        <Text type="secondary">{props.description}</Text>
      </Column>
      <Column>{props.children}</Column>
    </Row>
  );
}
