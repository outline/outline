// @flow
import { useMatches, Results } from "kbar";
import * as React from "react";
import { useVirtual } from "react-virtual";
import styled from "styled-components";
import CommandBarItem from "components/CommandBarItem";
import Scrollable from "components/Scrollable";

export default function CommandBarResults() {
  const matches = useMatches();
  const parentRef = React.useRef(null);
  const flattened = React.useMemo(
    () =>
      matches.reduce((acc, curr) => {
        const { actions, name } = curr;
        acc.push(name);
        acc.push(...actions);
        return acc;
      }, []),
    [matches]
  );

  const rowVirtualizer = useVirtual({
    size: flattened.length,
    parentRef,
  });

  return (
    <Results>
      <MaxHeight ref={parentRef}>
        <div
          style={{
            height: `${rowVirtualizer.totalSize}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.virtualItems.map((virtualRow) => {
            const item = flattened[virtualRow.index];
            return (
              <div
                key={typeof item === "string" ? item : item.id}
                ref={virtualRow.measureRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {typeof item === "string" ? (
                  <Header>{item}</Header>
                ) : (
                  <CommandBarItem action={item} />
                )}
              </div>
            );
          })}
        </div>
      </MaxHeight>
    </Results>
  );
}

const Header = styled.h3`
  font-size: 13px;
  letter-spacing: 0.04em;
  margin: 16px 0 4px 20px;
  color: ${(props) => props.theme.textTertiary};
`;

const MaxHeight = styled(Scrollable)`
  max-height: 400px;
`;
