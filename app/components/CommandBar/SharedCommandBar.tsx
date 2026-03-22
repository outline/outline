import { useKBar, KBarPositioner, KBarAnimator, KBarSearch } from "kbar";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Portal } from "react-portal";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import CommandBarResults from "./CommandBarResults";
import SharedSearchActions from "./SharedSearchActions";

/**
 * A simplified command bar for public shares that only provides search.
 */
function SharedCommandBar() {
  const { t } = useTranslation();

  return (
    <>
      <SharedSearchActions />
      <KBarPortal>
        <Positioner>
          <Animator>
            <SearchInput defaultPlaceholder={`${t("Search")}…`} />
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

export default observer(SharedCommandBar);
