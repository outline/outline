// @flow
import {
  useKBar,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useRegisterActions,
} from "kbar";
import { flattenDeep } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Portal } from "react-portal";
import styled from "styled-components";
import CommandBarItem from "components/CommandBarItem";
import { actionToKBar } from "actions";
import rootActions from "actions/root";
import env from "env";
import useStores from "hooks/useStores";

export const CommandBarOptions = {
  animations: {
    enterMs: 250,
    exitMs: 200,
  },
};

function CommandBar() {
  const { t } = useTranslation();
  const stores = useStores();
  const { currentRootActionId } = useKBar((state) => ({
    currentRootActionId: state.currentRootActionId,
  }));

  const context = {
    t,
    isCommandBar: true,
    isContextMenu: false,
    stores,
  };

  const actions = flattenDeep(
    rootActions.map((action) => actionToKBar(action, context))
  );

  const rootAction = actions.find(
    (action) => action.id === currentRootActionId
  );

  useRegisterActions(actions);

  if (env.ENVIRONMENT !== "development") {
    return null;
  }

  return (
    <KBarPortal>
      <Positioner>
        <Animator>
          <SearchInput
            placeholder={`${
              rootAction?.name || t("Type a command or search")
            }…`}
          />
          <Results
            onRender={(action, handlers, state) => (
              <CommandBarItem
                action={action}
                handlers={handlers}
                state={state}
              />
            )}
          />
        </Animator>
      </Positioner>
    </KBarPortal>
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

const Positioner = styled(KBarPositioner)`
  z-index: ${(props) => props.theme.depths.commandBar};
`;

const SearchInput = styled(KBarSearch)`
  padding: 12px 16px;
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

const Results = styled(KBarResults)`
  max-height: 400px;
  overflow: auto;
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
