import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";

type Props = {
  tabs: { id: string; title: string }[];
  activeTab: string;
  onClose: (id: string) => void;
  onSwitch: (id: string) => void;
};

function Tabs({ tabs, activeTab, onClose, onSwitch }: Props) {
  return (
    <Bar>
      {tabs.map((tab) => (
        <Tab key={tab.id} active={tab.id === activeTab}>
          <Title onClick={() => onSwitch(tab.id)}>{tab.title}</Title>
          <CloseButton onClick={() => onClose(tab.id)}>×</CloseButton>
        </Tab>
      ))}
    </Bar>
  );
}

const Bar = styled.div`
  display: flex;
  width: 100%;
  background: #eee;
`;

const Tab = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  padding: 10px;
  background: ${(props) => (props.active ? "#fff" : "#eee")};
  border-right: 1px solid #ccc;
  cursor: pointer;
`;

const Title = styled.div`
  margin-right: 10px;
`;

const CloseButton = styled.div`
  cursor: pointer;
`;

export default observer(Tabs);
