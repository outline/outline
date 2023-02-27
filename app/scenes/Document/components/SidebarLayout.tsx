import { observer } from "mobx-react";
import { BackIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import Tooltip from "~/components/Tooltip";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  title: React.ReactNode;
  children: React.ReactNode;
  onClose: React.MouseEventHandler;
  border?: boolean;
};

function SidebarLayout({ title, onClose, children }: Props) {
  const { t } = useTranslation();

  return (
    <>
      <Header>
        <Title>{title}</Title>
        <Tooltip tooltip={t("Close")} shortcut="Esc" delay={500}>
          <Button
            icon={<ForwardIcon />}
            onClick={onClose}
            borderOnHover
            neutral
          />
        </Tooltip>
      </Header>
      <Scrollable hiddenScrollbars topShadow>
        {children}
      </Scrollable>
    </>
  );
}

const ForwardIcon = styled(BackIcon)`
  transform: rotate(180deg);
  flex-shrink: 0;
`;

const Title = styled(Flex)`
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  align-items: center;
  justify-content: flex-start;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: none;
  overflow: hidden;
  width: 0;
  flex-grow: 1;
`;

const Header = styled(Flex)`
  align-items: center;
  position: relative;
  padding: 16px 12px 16px 16px;
  color: ${(props) => props.theme.text};
  flex-shrink: 0;
`;

export default observer(SidebarLayout);
