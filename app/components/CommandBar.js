// @flow
import {
  useKBar,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  Results as KBarResults,
  useMatches,
} from "kbar";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Portal } from "react-portal";
import styled from "styled-components";
import CommandBarItem from "components/CommandBarItem";
import Scrollable from "components/Scrollable";
import rootActions from "actions/root";
import env from "env";
import useCommandBarActions from "hooks/useCommandBarActions";

export const CommandBarOptions = {
  animations: {
    enterMs: 250,
    exitMs: 200,
  },
};

function CommandBar() {
  const { t } = useTranslation();

  useCommandBarActions(rootActions);

  const { rootAction } = useKBar((state) => ({
    rootAction: state.actions[state.currentRootActionId],
  }));

  if (env.ENVIRONMENT !== "development") {
    return null;
  }

  return (
    <KBarPortal>
      <Positioner>
        <Animator>
          <SearchInput
            placeholder={`${
              rootAction?.placeholder ||
              rootAction?.name ||
              t("Type a command or search")
            }…`}
          />
          <CommandBarResults />
        </Animator>
      </Positioner>
    </KBarPortal>
  );
}

function CommandBarResults() {
  const groups = useMatches();

  return (
    <KBarResults>
      <MaxHeight topShadow>
        {groups.map((group) => (
          <React.Fragment key={group.name}>
            {group.name !== "none" && <Header>{group.name}</Header>}
            {group.actions.map((action) => (
              <CommandBarItem key={action.id} action={action} />
            ))}
          </React.Fragment>
        ))}
      </MaxHeight>
    </KBarResults>
  );
}

function KBarPortal({ children }: { children: React.Node }) {
  const { showing } = useKBar((state) => ({
    showing: state.visualState !== "hidden",
  }));

  if (!showing) {
    return null;
  }

  return <Portal>{children}</Portal>;
}

const Header = styled.h3`
  font-size: 13px;
  letter-spacing: 0.04em;
  margin: 16px 0 4px 20px;
  color: ${(props) => props.theme.textTertiary};
`;

const Positioner = styled(KBarPositioner)`
  z-index: ${(props) => props.theme.depths.commandBar};
`;

const SearchInput = styled(KBarSearch)`
  padding: 16px 20px;
  width: 100%;
  outline: none;
  border: none;
  background: ${(props) => props.theme.menuBackground};
  color: ${(props) => props.theme.text};

  &:disabled,
  &::placeholder {
    color: ${(props) => props.theme.placeholder};
  }
`;

const MaxHeight = styled(Scrollable)`
  max-height: 400px;
`;

const Animator = styled(KBarAnimator)`
  max-width: 540px;
  width: 90vw;
  background: ${(props) => props.theme.menuBackground};
  color: ${(props) => props.theme.text};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: rgb(0 0 0 / 40%) 0px 16px 60px;
`;

export default observer(CommandBar);
