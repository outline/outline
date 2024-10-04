import { useMatches, KBarResults } from "kbar";
import * as React from "react";
import styled from "styled-components";
import Text from "~/components/Text";
import CommandBarItem from "./CommandBarItem";

export default function CommandBarResults() {
  const { results, rootActionId } = useMatches();

  if (results.length === 0) {
    return null;
  }

  return (
    <Container>
      <KBarResults
        items={results}
        maxHeight={400}
        onRender={({ item, active }) =>
          typeof item === "string" ? (
            <Header type="tertiary" size="xsmall" ellipsis>
              {item}
            </Header>
          ) : (
            <CommandBarItem
              action={item}
              active={active}
              currentRootActionId={rootActionId}
            />
          )
        }
      />
    </Container>
  );
}

// Cannot style KBarResults unfortunately, so we must wrap and target the inner
const Container = styled.div`
  > div {
    padding-bottom: 8px;
  }
`;

const Header = styled(Text).attrs({ as: "h3" })`
  letter-spacing: 0.03em;
  margin: 0;
  padding: 16px 0 4px 20px;
  height: 36px;
  cursor: default;
`;
