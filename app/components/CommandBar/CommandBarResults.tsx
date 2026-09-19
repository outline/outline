import { useMatches, useKBar, KBarResults, VisualState } from "kbar";
import { useEffect, useRef } from "react";
import styled from "styled-components";
import Text from "~/components/Text";
import CommandBarItem from "./CommandBarItem";

export default function CommandBarResults() {
  const { results, rootActionId } = useFrozenMatches();

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

/**
 * Returns the matching results, frozen for as long as the command bar is
 * animating away. Performing an action navigates, which registers a different
 * set of actions – without freezing, the options visibly change while the menu
 * is still on screen.
 *
 * @returns the results to render and the current root action id.
 */
function useFrozenMatches() {
  const matches = useMatches();
  const { isClosing } = useKBar((state) => ({
    isClosing: state.visualState === VisualState.animatingOut,
  }));

  // Only what was committed is worth freezing, so the last matches are recorded
  // after render rather than during it.
  const lastCommitted = useRef(matches);

  useEffect(() => {
    if (!isClosing) {
      lastCommitted.current = matches;
    }
  }, [isClosing, matches]);

  return isClosing ? lastCommitted.current : matches;
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
  padding-block: 16px 4px;
  padding-inline: 20px 0;
  height: 36px;
  cursor: default;
`;
