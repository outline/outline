import { CaretDownIcon, CaretUpIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import scrollIntoView from "scroll-into-view-if-needed";
import styled from "styled-components";
import { s } from "@shared/styles";
import { Separator } from "~/components/Actions";
import NudeButton from "~/components/NudeButton";

type Props = {
  revisionHtml: string;
  addSeparator: boolean;
};

const RevisionNavigator = (props: Props) => {
  const { revisionHtml, addSeparator } = props;
  const [opIndices, setOpIndices] = React.useState<number[]>([]);
  const [select, setSelect] = React.useState<number>(-1);
  const { t } = useTranslation();
  const total = opIndices.length;

  React.useEffect(() => {
    // Collect unique "data-operation-index" values as 'opIndices'
    const opIndices: number[] = [];
    const all = window.document.querySelectorAll("[data-operation-index]");
    all.forEach((e) => {
      const index = parseInt(e.getAttribute("data-operation-index") || "");
      if (!isNaN(index) && !opIndices.includes(index)) {
        opIndices.push(index);
      }
    });
    setOpIndices(opIndices);
  }, [revisionHtml]);

  const handleNav = React.useCallback(
    (dir: number) => {
      setSelect((prevSelect) => {
        // Update index (wrapped, covers both direction)
        let m = prevSelect === -1 && dir < 0 ? 0 : prevSelect;
        m = (m + dir + opIndices.length) % opIndices.length;

        // Jump to first element of 'data-operation-index=m'
        const target = window.document.querySelector(
          `[data-operation-index="${opIndices[m]}"]`
        );
        if (target) {
          scrollIntoView(target, {
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        }

        return m;
      });
    },
    [opIndices]
  );

  return total !== 0 ? (
    <>
      <Container>
        <span>
          {select === -1 && t("Total {{ count }} edit", { count: total })}
          {select !== -1 &&
            t("Edit {{ i }} of {{ total }}", { i: select + 1, total })}
        </span>
        <Button onClick={() => handleNav(-1)}>
          <CaretUpIcon />
        </Button>
        <Button onClick={() => handleNav(+1)}>
          <CaretDownIcon />
        </Button>
      </Container>
      {addSeparator && <Separator />}
    </>
  ) : null;
};

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  background: ${s("background")};
`;

const Button = styled(NudeButton)`
  width: 40px;
  height: 32px;
  border: 1px solid ${s("inputBorder")};
  padding: 4px;

  &:hover {
    background: ${s("sidebarControlHoverBackground")};
  }

  &:disabled {
    color: ${s("textTertiary")};
    background: none;
    cursor: default;
  }
`;

export default RevisionNavigator;
