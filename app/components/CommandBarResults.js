// @flow
import { useMatches, KBarResults, NO_GROUP } from "kbar";
import * as React from "react";
import styled from "styled-components";
import CommandBarItem from "components/CommandBarItem";

export default function CommandBarResults() {
  const matches = useMatches();
  const items = React.useMemo(
    () =>
      matches
        .reduce((acc, curr) => {
          const { actions, name } = curr;
          acc.push(name);
          acc.push(...actions);
          return acc;
        }, [])
        .filter((i) => i !== NO_GROUP),
    [matches]
  );

  return (
    <KBarResults
      items={items}
      maxHeight={400}
      onRender={({ item, active }) =>
        typeof item === "string" ? (
          <Header>{item}</Header>
        ) : (
          <CommandBarItem action={item} active={active} />
        )
      }
    />
  );
}

const Header = styled.h3`
  font-size: 13px;
  letter-spacing: 0.04em;
  margin: 0;
  padding: 16px 0 4px 20px;
  color: ${(props) => props.theme.textTertiary};
  height: 36px;
`;
