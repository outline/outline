import { useMatches, KBarResults } from "kbar";
import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import CommandBarItem from "~/components/CommandBarItem";

export default function CommandBarResults() {
  const { results, rootActionId } = useMatches();

  return (
    <Container>
      <KBarResults
        items={results}
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
    </Container>
  );
}

// Cannot style KBarResults unfortunately, so we must wrap and target the inner
const Container = styled.div`
  > div {
    padding-bottom: 8px;
  }
`;

const Header = styled.h3`
  font-size: 13px;
  letter-spacing: 0.04em;
  margin: 0;
  padding: 16px 0 4px 20px;
  color: ${s("textTertiary")};
  height: 36px;
`;
