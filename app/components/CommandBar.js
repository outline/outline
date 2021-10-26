// @flow
import { useKBar, KBarPositioner, KBarAnimator, KBarSearch } from "kbar";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Portal } from "react-portal";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import CommandBarResults from "components/CommandBarResults";
import rootActions from "actions/root";
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

const Animator = styled(KBarAnimator)`
  max-width: 600px;
  max-height: 75vh;
  width: 90vw;
  background: ${(props) => props.theme.menuBackground};
  color: ${(props) => props.theme.text};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: rgb(0 0 0 / 40%) 0px 16px 60px;
  transition: max-width 0.2s ease-in-out;

  ${breakpoint("desktopLarge")`
    max-width: 740px;
  `};

  @media print {
    display: none;
  }
`;

export default observer(CommandBar);
