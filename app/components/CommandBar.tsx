import { useKBar, KBarPositioner, KBarAnimator, KBarSearch } from "kbar";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Portal } from "react-portal";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import CommandBarResults from "~/components/CommandBarResults";
import SearchActions from "~/components/SearchActions";
import rootActions from "~/actions/root";
import useCommandBarActions from "~/hooks/useCommandBarActions";
import useSettingsActions from "~/hooks/useSettingsActions";
import { CommandBarAction } from "~/types";

function CommandBar() {
  const { t } = useTranslation();
  const settingsActions = useSettingsActions();
  const commandBarActions = React.useMemo(
    () => [...rootActions, settingsActions],
    [settingsActions]
  );

  useCommandBarActions(commandBarActions);

  const { rootAction } = useKBar((state) => ({
    rootAction: state.currentRootActionId
      ? (state.actions[
          state.currentRootActionId
        ] as unknown as CommandBarAction)
      : undefined,
  }));

  return (
    <>
      <KBarPortal>
        <Positioner>
          <Animator>
            <SearchActions />
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
    </>
  );
}

const KBarPortal: React.FC = ({ children }) => {
  const { showing } = useKBar((state) => ({
    showing: state.visualState !== "hidden",
  }));

  if (!showing) {
    return null;
  }

  return <Portal>{children}</Portal>;
};

const Positioner = styled(KBarPositioner)`
  z-index: ${depths.commandBar};
`;

const SearchInput = styled(KBarSearch)`
  padding: 16px 20px;
  width: 100%;
  outline: none;
  border: none;
  background: ${s("menuBackground")};
  color: ${s("text")};

  &:disabled,
  &::placeholder {
    color: ${s("placeholder")};
  }
`;

const Animator = styled(KBarAnimator)`
  max-width: 600px;
  max-height: 75vh;
  width: 90vw;
  background: ${s("menuBackground")};
  color: ${s("text")};
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
