import { useKBar, KBarPositioner, KBarAnimator, KBarSearch } from "kbar";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Portal } from "react-portal";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import SearchActions from "~/components/SearchActions";
import rootActions from "~/actions/root";
import useCommandBarActions from "~/hooks/useCommandBarActions";
import CommandBarResults from "./CommandBarResults";
import useRecentDocumentActions from "./useRecentDocumentActions";
import useSettingsAction from "./useSettingsAction";
import useTemplatesAction from "./useTemplatesAction";

function CommandBar() {
  const { t } = useTranslation();
  const recentDocumentActions = useRecentDocumentActions();
  const settingsAction = useSettingsAction();
  const templatesAction = useTemplatesAction();
  const commandBarActions = React.useMemo(
    () => [
      ...recentDocumentActions,
      ...rootActions,
      templatesAction,
      settingsAction,
    ],
    [recentDocumentActions, settingsAction, templatesAction]
  );

  useCommandBarActions(commandBarActions);

  return (
    <>
      <KBarPortal>
        <Positioner>
          <Animator>
            <SearchActions />
            <SearchInput
              defaultPlaceholder={`${t("Type a command or search")}…`}
            />
            <CommandBarResults />
          </Animator>
        </Positioner>
      </KBarPortal>
    </>
  );
}

type Props = {
  children?: React.ReactNode;
};

const KBarPortal: React.FC = ({ children }: Props) => {
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
  position: relative;
  padding: 16px 12px;
  margin: 0 8px;
  width: calc(100% - 16px);
  outline: none;
  border: none;
  background: ${s("menuBackground")};
  color: ${s("text")};

  &:not(:last-child) {
    border-bottom: 1px solid ${s("inputBorder")};
  }

  &:disabled,
  &::placeholder {
    color: ${s("placeholder")};
    opacity: 1;
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
