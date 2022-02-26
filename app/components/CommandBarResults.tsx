import { useMatches, KBarResults } from "kbar";
import { orderBy } from "lodash";
import * as React from "react";
import styled from "styled-components";
import CommandBarItem from "~/components/CommandBarItem";
import { SearchSection } from "~/actions/sections";

type Props = {
  prioritizeSearchResults: boolean;
};

export default function CommandBarResults(props: Props) {
  const { results, rootActionId } = useMatches();

  return (
    <KBarResults
      items={orderBy(results, (item) =>
        // this is an unfortunate hack until kbar supports priority internally
        typeof item !== "string" &&
        item.section === SearchSection &&
        props.prioritizeSearchResults
          ? -1
          : 1
      )}
      maxHeight={400}
      onRender={({ item, active }) =>
        typeof item === "string" ? (
          <Header>{item}</Header>
        ) : (
          <CommandBarItem
            action={item}
            active={active}
            currentRootActionId={rootActionId}
          />
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
