import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import scrollIntoView from "scroll-into-view-if-needed";
import styled from "styled-components";
import { ellipsis } from "@shared/styles";
import { Node as SearchResult } from "~/components/DocumentExplorerNode";
import Flex from "~/components/Flex";
import Text from "~/components/Text";

type Props = {
  selected: boolean;
  active: boolean;
  style: React.CSSProperties;
  icon?: React.ReactNode;
  title: string;
  path?: string;

  onPointerMove: (ev: React.MouseEvent) => void;
  onClick: (ev: React.MouseEvent) => void;
};

function DocumentExplorerSearchResult({
  selected,
  active,
  style,
  icon,
  title,
  path,
  onPointerMove,
  onClick,
}: Props) {
  const { t } = useTranslation();

  const ref = React.useCallback(
    (node: HTMLSpanElement | null) => {
      if (active && node) {
        scrollIntoView(node, {
          scrollMode: "if-needed",
          behavior: "auto",
          block: "nearest",
        });
      }
    },
    [active]
  );

  return (
    <SearchResult
      ref={ref}
      selected={selected}
      active={active}
      onClick={onClick}
      style={style}
      onPointerMove={onPointerMove}
      role="option"
    >
      {icon}
      <Flex>
        <Title>{title || t("Untitled")}</Title>
        <Path $selected={selected} size="xsmall">
          {path}
        </Path>
      </Flex>
    </SearchResult>
  );
}

const Title = styled(Text)`
  flex-shrink: 0;
  white-space: nowrap;
  margin: 0 4px 0 4px;
  color: inherit;
`;

const Path = styled(Text)<{ $selected: boolean }>`
  ${ellipsis()}
  padding-top: 2px;
  margin: 0 4px 0 8px;
  color: ${(props) =>
    props.$selected ? props.theme.white50 : props.theme.textTertiary};
`;

export default observer(DocumentExplorerSearchResult);
